import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const ADMIN_ONLY = () => Roles('ADMIN');
export const LISTENER_ONLY = () => Roles('LISTENER');
export const USER_ONLY = () => Roles('USER');
export const ADMIN_OR_LISTENER = () => Roles('ADMIN', 'LISTENER');
export const ADMIN_OR_USER = () => Roles('ADMIN', 'USER');
export const LISTENER_OR_ADMIN = () => Roles('LISTENER', 'ADMIN');
export const LISTENER_OR_USER = () => Roles('LISTENER', 'USER');
export const ANY_AUTHENTICATED = () => Roles('ADMIN', 'LISTENER', 'USER');

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class RoleBasedGuard implements CanActivate {
  private readonly logger = new Logger(RoleBasedGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      this.logger.warn('Role-based guard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      this.logger.warn(
        `User ${user.id} (${user.email}) with role ${user.role} attempted to access route requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    this.logger.debug(
      `User ${user.id} (${user.email}) with role ${user.role} granted access to route requiring roles: ${requiredRoles.join(', ')}`,
    );
    return true;
  }
}
