import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const USER_KEY = 'user';
export const User = () => SetMetadata(USER_KEY, true);

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@Injectable()
export class UserGuard implements CanActivate {
  private readonly logger = new Logger(UserGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isUserRoute = this.reflector.getAllAndOverride<boolean>(USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isUserRoute) {
      return true; // Not a user route, allow access
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      this.logger.warn('User guard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== 'USER') {
      this.logger.warn(
        `User ${user.id} (${user.email}) with role ${user.role} attempted to access user route`,
      );
      throw new ForbiddenException('User access required');
    }

    this.logger.debug(
      `User ${user.id} (${user.email}) granted access to user route`,
    );
    return true;
  }
}
