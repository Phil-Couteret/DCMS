import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InvitationsService, invitationStatus } from '../invitations/invitations.service.js';
import { MailerService } from '../mail/mailer.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { globalAccount } from './accounts.js';
import { InviteStaffDto } from './dto/invite-staff.dto.js';

const LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  invitedBy: { select: { email: true, name: true } },
} as const;

// A center's admins inviting staff (Settings → Users). The link goes by
// email only: the admin never sees it, and never knows the password, which
// the person sets themselves. Someone who already has a staff login (at
// another center) confirms with its password and gets access here.
// Invitation is a global model, so every query names the tenant.
@Injectable()
export class StaffInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
    private readonly invitations: InvitationsService,
    private readonly mailer: MailerService,
  ) {}

  // Invitations still open (pending, or expired and not yet resent or
  // cancelled), and whether email is set up at all.
  async list() {
    const tenantId = this.tenant.tenantId;
    const rows = await this.prisma.invitation.findMany({
      where: { tenantId, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: LIST_SELECT,
    });
    return {
      emailConfigured: this.mailer.configured,
      invitations: rows.map((r) => ({ ...r, status: invitationStatus(r) })),
    };
  }

  async invite(dto: InviteStaffDto, actorId: string) {
    this.assertEmail();
    const tenantId = this.tenant.tenantId;
    const account = await globalAccount(this.prisma, dto.email, {
      id: true,
      memberships: { where: { tenantId, isActive: true }, select: { id: true } },
    });
    if (account && account.memberships.length > 0) {
      throw new ConflictException(`${dto.email} already has access to this center`);
    }
    return this.issue({ email: dto.email, role: dto.role, name: dto.name ?? null }, actorId);
  }

  // A new link (the old one stops working), valid 7 days from now.
  async resend(id: string, actorId: string) {
    this.assertEmail();
    const current = await this.open(id);
    return this.issue({ email: current.email, role: current.role, name: current.name }, actorId);
  }

  async cancel(id: string) {
    await this.open(id);
    await this.prisma.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
    return { id, cancelled: true };
  }

  private async issue(data: { email: string; role: InviteStaffDto['role']; name: string | null }, actorId: string) {
    const tenantId = this.tenant.tenantId;
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true, slug: true } });
    // create() also cancels a pending invitation to the same email.
    const { invitation, token } = await this.prisma.$transaction((tx) =>
      this.invitations.create(tx, { tenantId, ...data, invitedById: actorId }),
    );
    const { emailed } = await this.invitations.send(token, invitation, tenant);
    // Not emailed (the mail server refused it): it stays listed, to resend.
    return { ...invitation, emailed };
  }

  private async open(id: string) {
    const row = await this.prisma.invitation.findFirst({
      where: { id, tenantId: this.tenant.tenantId },
      select: { id: true, email: true, name: true, role: true, acceptedAt: true, revokedAt: true, expiresAt: true },
    });
    if (!row || row.revokedAt) throw new NotFoundException('Invitation not found');
    if (row.acceptedAt) throw new ConflictException('This invitation has already been accepted');
    return row;
  }

  private assertEmail() {
    if (!this.mailer.configured) {
      throw new ServiceUnavailableException(
        'Email is not set up on this server (SMTP_URL), so invitations cannot be sent; add the user with a password instead',
      );
    }
  }
}
