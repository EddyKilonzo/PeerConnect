import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import {
  RoleBasedGuard,
  ADMIN_ONLY,
  LISTENER_ONLY,
  USER_ONLY,
} from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@Controller('users')
export class UsersController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
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
