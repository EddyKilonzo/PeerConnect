import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import {
  RegisterDto,
  RegisterWithTopicsDto,
  LoginDto,
  UpdateUserDto,
  RefreshTokenDto,
  CompleteProfileDto,
} from './dto';
import { JwtService, TokenResponse } from './jwt.service';
import * as bcrypt from 'bcrypt';

// Response DTOs for better type safety
export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  bio?: string | null;
  role: 'USER' | 'LISTENER' | 'ADMIN';
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AVAILABLE';
  createdAt: Date;
  updatedAt: Date;
  isEmailVerified: boolean;
  isApproved: boolean;
  profileCompleted?: boolean;
}

export class VerificationResponseDto {
  message: string;
  userId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(dto: RegisterDto): Promise<VerificationResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        this.logger.warn(
          `Registration attempt with existing email: ${dto.email}`,
        );
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user with verification code
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          profilePicture: dto.profilePicture,
          bio: dto.bio,
          role: dto.role || 'USER',
          emailVerificationCode: verificationCode,
          emailVerificationExpires: verificationExpires,
          isEmailVerified: false,
        },
      });

      // Send verification email
      try {
        await this.mailerService.sendVerificationEmail(
          dto.email,
          verificationCode,
          dto.firstName,
        );
        this.logger.log(
          `Verification email sent successfully to: ${dto.email}`,
        );
      } catch (emailError) {
        const errorMessage =
          emailError instanceof Error ? emailError.message : String(emailError);
        this.logger.error(
          `Failed to send verification email to: ${dto.email}`,
          errorMessage,
        );
        // Delete the user if email sending fails
        await this.prisma.user.delete({
          where: { id: user.id },
        });
        throw new InternalServerErrorException(
          'Failed to send verification email. Please try again later.',
        );
      }

      this.logger.log(
        `User registered successfully: ${user.email} (ID: ${user.id})`,
      );

      return {
        message:
          'Registration successful. Please check your email for verification code.',
        userId: user.id,
      };
    } catch (error: unknown) {
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error; // Re-throw business logic errors
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register user: ${dto.email}`, errorMessage);
      throw new InternalServerErrorException(
        'Failed to register user. Please try again later.',
      );
    }
  }

  async registerWithTopics(
    dto: RegisterWithTopicsDto,
  ): Promise<VerificationResponseDto> {
    // Validate input and use explicit type assertion
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Invalid registration data');
    }

    // Use explicit type assertion to resolve TypeScript strict mode issues
    const data = dto as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      profilePicture?: string;
      bio?: string;
      role?: 'USER' | 'LISTENER' | 'ADMIN';
      topicIds: string[];
    };

    if (
      !data.email ||
      !data.password ||
      !data.firstName ||
      !data.lastName ||
      !data.topicIds ||
      !Array.isArray(data.topicIds)
    ) {
      throw new BadRequestException('Missing required registration fields');
    }

    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        this.logger.warn(
          `Registration with topics attempt with existing email: ${data.email}`,
        );
        throw new ConflictException('User with this email already exists');
      }

      // Validate topic selection
      if (data.topicIds.length < 3 || data.topicIds.length > 5) {
        throw new BadRequestException('You must select between 3 and 5 topics');
      }

      // Verify that all topic IDs exist
      const existingTopics = await this.prisma.topic.findMany({
        where: { id: { in: data.topicIds } },
        select: { id: true },
      });

      if (existingTopics.length !== data.topicIds.length) {
        throw new BadRequestException('One or more topic IDs are invalid');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user with verification code and topics
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          profilePicture: data.profilePicture,
          bio: data.bio,
          role: data.role || 'USER',
          emailVerificationCode: verificationCode,
          emailVerificationExpires: verificationExpires,
          isEmailVerified: false,
          profileCompleted: true, // Mark as completed since topics are selected
          topics: {
            connect: data.topicIds.map((id) => ({ id })),
          },
        },
      });

      // Send verification email
      try {
        await this.mailerService.sendVerificationEmail(
          data.email,
          verificationCode,
          data.firstName,
        );
        this.logger.log(
          `Verification email sent successfully to: ${data.email}`,
        );
      } catch (emailError) {
        const errorMessage =
          emailError instanceof Error ? emailError.message : String(emailError);
        this.logger.error(
          `Failed to send verification email to: ${data.email}`,
          errorMessage,
        );
        // Delete the user if email sending fails
        await this.prisma.user.delete({
          where: { id: user.id },
        });
        throw new InternalServerErrorException(
          'Failed to send verification email. Please try again later.',
        );
      }

      this.logger.log(
        `User registered with topics successfully: ${user.email} (ID: ${user.id}) with ${data.topicIds.length} topics`,
      );

      return {
        message:
          'Registration with topics successful. Please check your email for verification code.',
        userId: user.id,
      };
    } catch (error: unknown) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error; // Re-throw business logic errors
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to register user with topics: ${data.email}`,
        errorMessage,
      );
      throw new InternalServerErrorException(
        'Failed to register user with topics. Please try again later.',
      );
    }
  }

  async verifyEmail(
    email: string,
    verificationCode: string,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          emailVerificationCode: verificationCode,
          emailVerificationExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired verification code');
      }

      // Update user to verified
      const verifiedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpires: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
        },
      });

      // Send welcome email
      try {
        await this.mailerService.sendWelcomeEmail(
          verifiedUser.email,
          verifiedUser.firstName,
        );
        this.logger.log(
          `Welcome email sent successfully to: ${verifiedUser.email}`,
        );
      } catch (emailError) {
        const errorMessage =
          emailError instanceof Error ? emailError.message : String(emailError);
        this.logger.warn(
          `Failed to send welcome email to: ${verifiedUser.email}`,
          errorMessage,
        );
        // Don't fail the verification if welcome email fails
      }

      this.logger.log(
        `Email verified successfully for user: ${verifiedUser.email} (ID: ${verifiedUser.id})`,
      );

      return verifiedUser as UserResponseDto;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to verify email for: ${email}`, errorMessage);
      throw new InternalServerErrorException(
        'Failed to verify email. Please try again later.',
      );
    }
  }

  async login(dto: LoginDto): Promise<UserResponseDto & TokenResponse> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${dto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isEmailVerified) {
        this.logger.warn(`Login attempt with unverified email: ${dto.email}`);
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(
          `Login attempt with invalid password for email: ${dto.email}`,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const tokens = this.jwtService.generateTokenPair({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // Update user status to ONLINE
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ONLINE' },
      });

      this.logger.log(
        `User logged in successfully: ${user.email} (ID: ${user.id})`,
      );

      // Remove password from response and return user data with tokens
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = user;

      return {
        ...userResponse,
        ...tokens,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw business logic errors
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Login failed for email: ${dto.email}`, errorMessage);
      throw new InternalServerErrorException(
        'Login failed. Please try again later.',
      );
    }
  }

  async checkProfileCompletion(
    userId: string,
  ): Promise<{ profileCompleted: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { profileCompleted: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return { profileCompleted: Boolean(user.profileCompleted) };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check profile completion for user ID: ${userId}`,
        errorMessage,
      );
      throw new InternalServerErrorException(
        'Failed to check profile completion',
      );
    }
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, firstName: true, isEmailVerified: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Generate new verification code
      const verificationCode = this.generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with new verification code
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationCode: verificationCode,
          emailVerificationExpires: verificationExpires,
        },
      });

      // Send new verification email
      await this.mailerService.sendVerificationEmail(
        email,
        verificationCode,
        user.firstName,
      );

      this.logger.log(`Verification code resent to: ${email}`);

      return {
        message:
          'Verification code sent successfully. Please check your email.',
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resend verification code to: ${email}`,
        errorMessage,
      );
      throw new InternalServerErrorException(
        'Failed to resend verification code. Please try again later.',
      );
    }
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponse> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verifyRefreshToken(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (dto as any).refreshToken as string,
      );

      // Check if user still exists and is valid
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        this.logger.warn(`Refresh token for non-existent user: ${payload.sub}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!user.isEmailVerified) {
        this.logger.warn(`Refresh token for unverified user: ${payload.sub}`);
        throw new UnauthorizedException('Email not verified');
      }

      // Generate new token pair
      const tokens = this.jwtService.generateTokenPair({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      this.logger.log(
        `Tokens refreshed successfully for user: ${user.email} (ID: ${user.id})`,
      );

      return tokens;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to refresh tokens', errorMessage);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          profileCompleted: true,
          topics: { select: { id: true } },
        },
      });

      if (!existingUser) {
        this.logger.warn(
          `Profile completion attempt for non-existent user ID: ${userId}`,
        );
        throw new UnauthorizedException('User not found');
      }

      if (existingUser.profileCompleted) {
        this.logger.warn(
          `Profile completion attempt for already completed profile: ${userId}`,
        );
        throw new BadRequestException('Profile is already completed');
      }

      // Verify that all topic IDs exist
      const existingTopics = await this.prisma.topic.findMany({
        where: { id: { in: dto.topicIds } },
        select: { id: true },
      });

      if (existingTopics.length !== dto.topicIds.length) {
        this.logger.warn(`Invalid topic IDs provided for user: ${userId}`);
        throw new BadRequestException('One or more topic IDs are invalid');
      }

      // Update user profile and connect topics
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          bio: dto.bio,
          profilePicture: dto.profilePicture,
          profileCompleted: true,
          topics: {
            connect: dto.topicIds.map((id) => ({ id })),
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          role: true,
          status: true,
          updatedAt: true,
          createdAt: true,
          isEmailVerified: true,
          isApproved: true,
          profileCompleted: true,
        },
      });

      this.logger.log(
        `Profile completed successfully for user: ${updatedUser.email} (ID: ${updatedUser.id})`,
      );
      return updatedUser as UserResponseDto;
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error; // Re-throw business logic errors
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to complete profile for user ID: ${userId}`,
        errorMessage,
      );
      throw new InternalServerErrorException(
        'Failed to complete profile. Please try again later.',
      );
    }
  }

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      // Check if user exists before updating
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!existingUser) {
        this.logger.warn(`Update attempt for non-existent user ID: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: dto,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          role: true,
          status: true,
          updatedAt: true,
          createdAt: true,
          isEmailVerified: true,
          isApproved: true,
        },
      });

      this.logger.log(
        `User updated successfully: ${updatedUser.email} (ID: ${updatedUser.id})`,
      );
      return updatedUser as UserResponseDto;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw business logic errors
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update user ID: ${userId}`, errorMessage);
      throw new InternalServerErrorException(
        'Failed to update user. Please try again later.',
      );
    }
  }
}
