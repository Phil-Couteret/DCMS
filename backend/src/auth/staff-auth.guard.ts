import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Roles that may use the backoffice and its API.
export const STAFF_ROLES: readonly Role[] = [Role.ADMIN, Role.INSTRUCTOR];

export function isStaffRole(role: unknown) {
  return STAFF_ROLES.includes(role as Role);
}

// A valid user token (JwtAuthGuard) for a tenant where its account has an
// active membership now; the request's role is that membership's. A
// superadmin who entered a tenant without a membership acts as its admin.
// Both are read from the database on every request, not trusted from the
// token, so a demoted, deactivated or removed account loses access at once
// rather than when its token expires. Customer tokens get 403; partner
// tokens are already refused by the JWT strategy (401).
@Injectable()
export class StaffAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!(await super.canActivate(context))) return false;
    const request = context.switchToHttp().getRequest<{ user: { id: string; role: string; tenantId: string | null } }>();
    const tenantId = request.user.tenantId;
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        isSuperadmin: true,
        memberships: { where: { tenantId: tenantId ?? '', isActive: true }, select: { role: true } },
      },
    });
    if (!user) throw new ForbiddenException('Staff access only');
    if (!tenantId) throw new ForbiddenException('Choose a center first');
    const membership = user.memberships[0];
    if (membership) request.user.role = membership.role;
    else if (user.isSuperadmin) request.user.role = Role.ADMIN;
    else throw new ForbiddenException(request.user.role === Role.CUSTOMER ? 'Staff access only' : 'No access to this center');
    return true;
  }
}
