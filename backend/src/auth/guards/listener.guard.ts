import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const LISTENER_KEY = 'listener';
export const Listener = () => SetMetadata(LISTENER_KEY, true);

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class ListenerGuard implements CanActivate {
  private readonly logger = new Logger(ListenerGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isListenerRoute = this.reflector.getAllAndOverride<boolean>(
      LISTENER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isListenerRoute) {
      return true; // Not a listener route, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      this.logger.warn('Listener guard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== 'LISTENER') {
      this.logger.warn(
        `User ${user.id} (${user.email}) with role ${user.role} attempted to access listener route`,
      );
      throw new ForbiddenException('Listener access required');
    }

    this.logger.debug(
      `Listener ${user.id} (${user.email}) granted access to listener route`,
    );
    return true;
  }
}
