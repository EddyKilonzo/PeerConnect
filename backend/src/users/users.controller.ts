import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import {
  RoleBasedGuard,
  ADMIN_ONLY,
  LISTENER_ONLY,
  USER_ONLY,
} from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the current authenticated user profile information',
  })
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile accessed successfully' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User unique identifier' },
            email: { type: 'string', description: 'User email address' },
            firstName: { type: 'string', description: 'User first name' },
            lastName: { type: 'string', description: 'User last name' },
            role: {
              type: 'string',
              enum: ['USER', 'LISTENER', 'ADMIN'],
              description: 'User role',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Profile accessed successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RoleBasedGuard)
  @ADMIN_ONLY()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Admin only route',
    description: 'Access restricted to users with ADMIN role only',
  })
  @ApiOkResponse({
    description: 'Admin access granted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin access granted' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User unique identifier' },
            email: { type: 'string', description: 'User email address' },
            role: {
              type: 'string',
              enum: ['ADMIN'],
              description: 'User role (must be ADMIN)',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - ADMIN role required',
  })
  adminOnlyRoute(@CurrentUser() user: any) {
    return {
      message: 'Admin access granted',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Get('listener-only')
  @UseGuards(JwtAuthGuard, RoleBasedGuard)
  @LISTENER_ONLY()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listener only route',
    description: 'Access restricted to users with LISTENER role only',
  })
  @ApiOkResponse({
    description: 'Listener access granted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Listener access granted' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User unique identifier' },
            email: { type: 'string', description: 'User email address' },
            role: {
              type: 'string',
              enum: ['LISTENER'],
              description: 'User role (must be LISTENER)',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - LISTENER role required',
  })
  listenerOnlyRoute(@CurrentUser() user: any) {
    return {
      message: 'Listener access granted',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Get('user-only')
  @UseGuards(JwtAuthGuard, RoleBasedGuard)
  @USER_ONLY()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User only route',
    description: 'Access restricted to users with USER role only',
  })
  @ApiOkResponse({
    description: 'User access granted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User access granted' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User unique identifier' },
            email: { type: 'string', description: 'User email address' },
            role: {
              type: 'string',
              enum: ['USER'],
              description: 'User role (must be USER)',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - USER role required',
  })
  userOnlyRoute(@CurrentUser() user: any) {
    return {
      message: 'User access granted',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
