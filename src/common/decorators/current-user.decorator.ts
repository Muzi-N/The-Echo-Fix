import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  username: string;
}

/**
 * Pulls the authenticated user attached by the JWT strategy. Usable in any
 * route handler as @CurrentUser().
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user[data] : user;
  },
);
