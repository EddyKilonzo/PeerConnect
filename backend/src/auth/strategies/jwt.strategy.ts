import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      // Extract user ID from JWT payload
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('JWT payload missing user ID');
        throw new UnauthorizedException('Invalid token');
      }

      // Fetch user from database to ensure they still exist and are valid
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`JWT token references non-existent user: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      if (!user.isEmailVerified) {
        this.logger.warn(`JWT token for unverified user: ${userId}`);
        throw new UnauthorizedException('Email not verified');
      }

      // Return user object that will be available in request
      return user;
    } catch (error) {
      this.logger.error('JWT validation failed', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
