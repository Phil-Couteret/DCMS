import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { StaffAuthGuard } from './staff-auth.guard.js';

// A staff token (StaffAuthGuard) whose account is an admin now. The role was
// just read from the database by the parent guard.
@Injectable()
export class AdminAuthGuard extends StaffAuthGuard {
  async canActivate(context: ExecutionContext) {
    if (!(await super.canActivate(context))) return false;
    const request = context.switchToHttp().getRequest<{ user: { role: string } }>();
    if (request.user.role !== Role.ADMIN) throw new ForbiddenException('Admin access only');
    return true;
  }
}
