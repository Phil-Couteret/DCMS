import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service.js';

// A valid user token whose account is a superadmin now (read from the
// database on every request), whatever tenant the token is for.
@Injectable()
export class SuperadminGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!(await super.canActivate(context))) return false;
    const { user } = context.switchToHttp().getRequest<{ user: { id: string } }>();
    const row = await this.prisma.user.findUnique({ where: { id: user.id }, select: { isSuperadmin: true } });
    if (!row?.isSuperadmin) throw new ForbiddenException('Superadmin access only');
    return true;
  }
}
