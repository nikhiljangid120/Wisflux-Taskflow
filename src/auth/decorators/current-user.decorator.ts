// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): AuthUser | string => {
    const request = ctx
      .switchToHttp()
      .getRequest<import('express').Request & { user: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
