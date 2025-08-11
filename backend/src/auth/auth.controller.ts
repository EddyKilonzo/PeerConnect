import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  AuthService,
  UserResponseDto,
  VerificationResponseDto,
} from './auth.service';
import {
  RegisterDto,
  RegisterWithTopicsDto,
  LoginDto,
  RefreshTokenDto,
  CompleteProfileDto,
} from './dto';
import { TokenResponse } from './jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with basic information. Available to all users (no authentication required).',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: VerificationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async register(
    @Body(ValidationPipe) dto: RegisterDto,
  ): Promise<VerificationResponseDto> {
    return this.authService.register(dto);
  }

  @Post('register-with-topics')
  @ApiOperation({
    summary: 'Register user with topic selection',
    description:
      'Create a new user account with topic preferences (3-5 topics required). Available to all users (no authentication required).',
  })
  @ApiBody({ type: RegisterWithTopicsDto })
  @ApiCreatedResponse({
    description: 'User registered with topics successfully',
    type: VerificationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input data, validation errors, or insufficient topics',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async registerWithTopics(
    @Body(ValidationPipe) dto: RegisterWithTopicsDto,
  ): Promise<VerificationResponseDto> {
    return this.authService.registerWithTopics(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user and return JWT tokens. Available to all users (no authentication required).',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['USER', 'LISTENER', 'ADMIN'] },
        profileCompleted: { type: 'boolean' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async login(
    @Body(ValidationPipe) dto: LoginDto,
  ): Promise<UserResponseDto & TokenResponse> {
    return this.authService.login(dto);
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verify user email with verification code. Available to all users (no authentication required).',
  })
  @ApiQuery({ name: 'email', description: 'User email address' })
  @ApiQuery({ name: 'code', description: 'Verification code sent to email' })
  @ApiOkResponse({
    description: 'Email verified successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid verification code or expired code',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async verifyEmail(
    @Query('email') email: string,
    @Query('code') code: string,
  ): Promise<UserResponseDto> {
    return this.authService.verifyEmail(email, code);
  }

  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend verification code',
    description:
      'Resend email verification code to user. Available to all users (no authentication required).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email address' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Verification code resent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email address',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async resendVerificationCode(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationCode(email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get new access token using refresh token. Available to all authenticated users.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', description: 'Refresh token' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'New access token' },
        refreshToken: { type: 'string', description: 'New refresh token' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async refreshToken(
    @Body(ValidationPipe) dto: RefreshTokenDto,
  ): Promise<TokenResponse> {
    return this.authService.refreshToken(dto);
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Complete user profile',
    description:
      'Complete user profile with additional information. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiBody({ type: CompleteProfileDto })
  @ApiOkResponse({
    description: 'Profile completed successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async completeProfile(
    @Request() req: { user: { id: string } },
    @Body(ValidationPipe) dto: CompleteProfileDto,
  ): Promise<UserResponseDto> {
    return this.authService.completeProfile(req.user.id, dto);
  }

  @Get('profile-completion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if user profile is completed',
    description:
      'Check the completion status of user profile. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiOkResponse({
    description: 'Profile completion status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        profileCompleted: {
          type: 'boolean',
          description: 'Whether profile is completed',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async checkProfileCompletion(
    @Request() req: { user: { id: string } },
  ): Promise<{ profileCompleted: boolean }> {
    return this.authService.checkProfileCompletion(req.user.id);
  }
}
