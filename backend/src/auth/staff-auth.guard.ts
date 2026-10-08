import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Roles that may use the backoffice and its API.
export const STAFF_ROLES: readonly Role[] = [Role.ADMIN, Role.INSTRUCTOR];

export function isStaffRole(role: unknown) {
  return STAFF_ROLES.includes(role as Role);
}

// A valid user token (JwtAuthGuard) whose account is staff now. The role is
// read from the database on every request, not trusted from the token, so a
// demoted or deleted account loses access at once rather than when its
// token expires. Customer tokens get 403; partner tokens are already refused
// by the JWT strategy (401).
@Injectable()
export class StaffAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!(await super.canActivate(context))) return false;
    const request = context.switchToHttp().getRequest<{ user: { id: string; role: string } }>();
    const user = await this.prisma.user.findUnique({ where: { id: request.user.id }, select: { role: true } });
    if (!user || !isStaffRole(user.role)) throw new ForbiddenException('Staff access only');
    request.user.role = user.role;
    return true;
  }
}
