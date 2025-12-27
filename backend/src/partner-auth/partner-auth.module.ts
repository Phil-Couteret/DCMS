import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerAuthController } from './partner-auth.controller';
import { JwtPartnerStrategy } from './jwt-partner.strategy';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' }, // Partner tokens valid for 7 days
    }),
  ],
  controllers: [PartnerAuthController],
  providers: [PartnerAuthService, JwtPartnerStrategy, PrismaService],
  exports: [PartnerAuthService, JwtModule],
})
export class PartnerAuthModule {}
