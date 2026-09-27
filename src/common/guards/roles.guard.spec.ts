import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/user.entity';

function ctxWith(user?: { role: UserRole }): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles?: UserRole[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('allows any caller when the route declares no @Roles', () => {
    requireRoles(undefined);
    expect(guard.canActivate(ctxWith({ role: UserRole.CUSTOMER }))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    requireRoles([UserRole.STAFF, UserRole.ADMIN]);
    expect(guard.canActivate(ctxWith({ role: UserRole.STAFF }))).toBe(true);
  });

  it('rejects a user whose role is not listed', () => {
    requireRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(ctxWith({ role: UserRole.CUSTOMER }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an anonymous caller on a protected route', () => {
    requireRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(ctxWith(undefined))).toThrow(ForbiddenException);
  });
});
