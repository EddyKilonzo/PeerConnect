import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    try {
      const token = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ),
      });

      this.logger.debug(`Access token generated for user: ${payload.sub}`);
      return token;
    } catch (error) {
      this.logger.error('Failed to generate access token', error);
      throw error;
    }
  }

  generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    try {
      const token = this.jwtService.sign(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET') ||
          'fallback-secret',
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      });

      this.logger.debug(`Refresh token generated for user: ${payload.sub}`);
      return token;
    } catch (error) {
      this.logger.error('Failed to generate refresh token', error);
      throw error;
    }
  }

  generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>): TokenResponse {
    try {
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);
      const expiresIn = this.getTokenExpirationTime(accessToken);

      this.logger.debug(`Token pair generated for user: ${payload.sub}`);

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Failed to generate token pair', error);
      throw error;
    }
  }

  verifyToken(token: string): TokenPayload {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'fallback-secret',
      });

      this.logger.debug(`Token verified for user: ${payload.sub}`);
      return payload;
    } catch (error) {
      this.logger.warn('Token verification failed', error);
      throw error;
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET') ||
          'fallback-secret',
      });

      this.logger.debug(`Refresh token verified for user: ${payload.sub}`);
      return payload;
    } catch (error) {
      this.logger.warn('Refresh token verification failed', error);
      throw error;
    }
  }

  private getTokenExpirationTime(token: string): number {
    try {
      const decoded = this.jwtService.decode(token);
      if (decoded && decoded.exp) {
        return decoded.exp * 1000; // Convert to milliseconds
      }
      return 0;
    } catch (error) {
      this.logger.warn('Failed to decode token expiration time', error);
      return 0;
    }
  }

  extractUserIdFromToken(token: string): string | null {
    try {
      const payload = this.jwtService.decode(token);
      return payload?.sub || null;
    } catch (error) {
      this.logger.warn('Failed to extract user ID from token', error);
      return null;
    }
  }
}
