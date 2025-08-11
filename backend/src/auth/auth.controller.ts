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
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(ValidationPipe) dto: RegisterDto,
  ): Promise<VerificationResponseDto> {
    return this.authService.register(dto);
  }

  @Post('register-with-topics')
  @ApiOperation({
    summary: 'Register user with topic selection (3-5 topics required)',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered with topics successfully',
    type: VerificationResponseDto,
  })
  async registerWithTopics(
    @Body(ValidationPipe) dto: RegisterWithTopicsDto,
  ): Promise<VerificationResponseDto> {
    return this.authService.registerWithTopics(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) dto: LoginDto,
  ): Promise<UserResponseDto & TokenResponse> {
    return this.authService.login(dto);
  }

  @Get('verify-email')
  async verifyEmail(
    @Query('email') email: string,
    @Query('code') code: string,
  ): Promise<UserResponseDto> {
    return this.authService.verifyEmail(email, code);
  }

  @Post('resend-verification')
  async resendVerificationCode(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationCode(email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body(ValidationPipe) dto: RefreshTokenDto,
  ): Promise<TokenResponse> {
    return this.authService.refreshToken(dto);
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async completeProfile(
    @Request() req,
    @Body(ValidationPipe) dto: CompleteProfileDto,
  ): Promise<UserResponseDto> {
    return this.authService.completeProfile(req.user.id, dto);
  }

  @Get('profile-completion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user profile is completed' })
  @ApiResponse({
    status: 200,
    description: 'Profile completion status',
    schema: {
      type: 'object',
      properties: {
        profileCompleted: { type: 'boolean' },
      },
    },
  })
  async checkProfileCompletion(
    @Request() req,
  ): Promise<{ profileCompleted: boolean }> {
    return this.authService.checkProfileCompletion(req.user.id);
  }
}
