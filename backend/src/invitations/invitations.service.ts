import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { Prisma } from '../generated/prisma/client.js';
import { MembershipRole, Role } from '../generated/prisma/enums.js';
import { MailerService } from '../mail/mailer.service.js';
import { globalAccount } from '../users/accounts.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

const TTL_DAYS = 7;
const BCRYPT_ROUNDS = 12;

type Db = Pick<Prisma.TransactionClient, 'invitation'>;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

// The address of a center's backoffice: BACKOFFICE_URL with {slug} replaced
// (e.g. "https://{slug}.admin.couteret.fr"). Without {slug} it is one
// address for every center (development).
export function backofficeUrl(slug: string) {
  return (process.env.BACKOFFICE_URL ?? 'http://localhost:3001').replace('{slug}', slug).replace(/\/+$/, '');
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export function invitationStatus(i: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }): InvitationStatus {
  if (i.acceptedAt) return 'ACCEPTED';
  if (i.revokedAt) return 'REVOKED';
  return i.expiresAt <= new Date() ? 'EXPIRED' : 'PENDING';
}

// Invitations to join a center's staff: a one-time link sent by email.
// Only the token's SHA-256 is stored, so a leaked database does not leak
// usable links; the link itself is shown once, to whoever sent it.
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // A new invitation, inside the caller's transaction. A pending one to the
  // same email for the same center is revoked: only the newest link works.
  async create(
    db: Db,
    data: { tenantId: string; email: string; name?: string | null; role?: MembershipRole; invitedById: string },
  ) {
    const email = data.email.trim().toLowerCase();
    await db.invitation.updateMany({
      where: { tenantId: data.tenantId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const token = randomBytes(32).toString('base64url');
    const invitation = await db.invitation.create({
      data: {
        tenantId: data.tenantId,
        email,
        name: data.name?.trim() || null,
        role: data.role ?? MembershipRole.ADMIN,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000),
        invitedById: data.invitedById,
      },
      select: { id: true, email: true, name: true, role: true, expiresAt: true },
    });
    return { invitation, token };
  }

  // Emails the link. Returns it as well, for the sender to pass on when no
  // email could be sent (SMTP not configured, or a delivery error).
  async send(token: string, invitation: { email: string; name: string | null; role: MembershipRole }, tenant: { name: string; slug: string }) {
    const link = `${backofficeUrl(tenant.slug)}/invite/${token}`;
    const role = invitation.role === MembershipRole.ADMIN ? 'an admin' : 'an instructor';
    const emailed = await this.mailer.send({
      to: invitation.email,
      subject: `You are invited to ${tenant.name}`,
      text: [
        `Hello${invitation.name ? ` ${invitation.name}` : ''},`,
        '',
        `You have been invited to join ${tenant.name} as ${role} on the dive center backoffice.`,
        `Open this link within ${TTL_DAYS} days to set your password and sign in:`,
        '',
        link,
        '',
        'If you were not expecting this, you can ignore this email.',
      ].join('\n'),
    });
    return { link, emailed };
  }

  private async find(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hash(token) },
      include: { tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
    });
    if (!invitation || !invitation.tenant.isActive) throw new NotFoundException('This invitation link is not valid');
    return invitation;
  }

  // What the invitation page shows before it is accepted.
  async preview(token: string) {
    const invitation = await this.find(token);
    // Staff logins are global accounts; a customer account at some company
    // with the same email is separate and does not count.
    const account = await globalAccount(this.prisma, invitation.email, { role: true });
    return {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      tenant: { name: invitation.tenant.name, slug: invitation.tenant.slug },
      status: invitationStatus(invitation),
      expiresAt: invitation.expiresAt,
      // An existing staff account confirms with its password instead of
      // setting one. A customer account cannot be used.
      existingAccount: account !== null,
      customerAccount: account?.role === Role.CUSTOMER,
      signInUrl: `${backofficeUrl(invitation.tenant.slug)}/login`,
    };
  }

  // Joins the center: a new account with the name and password given, or an
  // existing one proven by its current password. Single use.
  async accept(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.find(token);
    const status = invitationStatus(invitation);
    if (status === 'ACCEPTED') throw new ConflictException('This invitation has already been used');
    if (status !== 'PENDING') throw new GoneException('This invitation has expired; ask for a new one');

    const existing = await globalAccount(this.prisma, invitation.email, { id: true, role: true, passwordHash: true });
    if (existing) {
      if (existing.role === Role.CUSTOMER) {
        throw new BadRequestException('This email belongs to a customer account; ask to be invited with another email');
      }
      if (!dto.currentPassword || !(await bcrypt.compare(dto.currentPassword, existing.passwordHash))) {
        throw new BadRequestException('Your current password is incorrect');
      }
    } else if (!dto.password || !dto.name?.trim()) {
      throw new BadRequestException('Enter your name and choose a password');
    }
    const passwordHash = existing ? null : await bcrypt.hash(dto.password!, BCRYPT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      // Taken once: a second accept of the same link finds nothing to update.
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (count === 0) throw new ConflictException('This invitation has already been used');
      const userId =
        existing?.id ??
        (
          await tx.user.create({
            data: {
              email: invitation.email,
              name: dto.name!.trim(),
              passwordHash: passwordHash!,
              role: invitation.role,
            },
            select: { id: true },
          })
        ).id;
      await tx.membership.upsert({
        where: { userId_tenantId: { userId, tenantId: invitation.tenantId } },
        create: { userId, tenantId: invitation.tenantId, role: invitation.role },
        update: { role: invitation.role, isActive: true },
      });
    });
    return { ok: true, signInUrl: `${backofficeUrl(invitation.tenant.slug)}/login` };
  }

  // A center's invitations, newest first (superadmin console).
  async list(tenantId: string) {
    const rows = await this.prisma.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        invitedBy: { select: { email: true } },
      },
    });
    return rows.map((r) => ({ ...r, status: invitationStatus(r) }));
  }
}
