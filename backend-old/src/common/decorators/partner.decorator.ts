import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Partner = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Check both request.partner (API key auth) and request.user (JWT auth)
    return request.partner || request.user;
  },
);

