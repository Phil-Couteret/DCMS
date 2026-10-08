import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { SuperadminController } from './superadmin.controller.js';
import { SuperadminService } from './superadmin.service.js';

@Module({
  imports: [InvitationsModule],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
