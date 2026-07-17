import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

function makeContext(): ExecutionContext {
  return {
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('bypasses auth (returns true, does not call passport) when @Public() metadata is present', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const superCanActivate = jest.spyOn(parentProto, 'canActivate').mockImplementation(() => {
      throw new Error('should not be called when route is @Public()');
    });

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );

    superCanActivate.mockRestore();
  });

  it('delegates to the passport (jwt-admin) canActivate when no @Public() metadata is present', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const superCanActivate = jest.spyOn(parentProto, 'canActivate').mockReturnValue(true as any);

    const context = makeContext();
    const result = guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalledWith(context);
    expect(result).toBe(true);

    superCanActivate.mockRestore();
  });
});
