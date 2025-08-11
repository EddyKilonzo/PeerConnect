import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ADMIN_KEY = 'admin';
export const Admin = () => SetMetadata(ADMIN_KEY, true);

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isAdminRoute = this.reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdminRoute) {
      return true; // Not an admin route, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      this.logger.warn('Admin guard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== 'ADMIN') {
      this.logger.warn(
        `User ${user.id} (${user.email}) with role ${user.role} attempted to access admin route`,
      );
      throw new ForbiddenException('Admin access required');
    }

    this.logger.debug(
      `Admin ${user.id} (${user.email}) granted access to admin route`,
    );
    return true;
  }
}
