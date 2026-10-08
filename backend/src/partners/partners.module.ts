import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SettingsModule } from '../settings/settings.module.js';
import { PartnerJwtStrategy } from './partner-jwt.strategy.js';
import { PartnerInvoicesController, PartnersController } from './partners.controller.js';
import { PartnersService } from './partners.service.js';
import { PartnerAuthController, PortalController } from './portal.controller.js';
import { PortalService } from './portal.service.js';

@Module({
  imports: [
    SettingsModule,
    PassportModule,
    // Same secret and lifetime as user tokens (AuthModule).
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '1d') },
      }),
    }),
  ],
  controllers: [PartnersController, PartnerInvoicesController, PartnerAuthController, PortalController],
  providers: [PartnersService, PortalService, PartnerJwtStrategy],
})
export class PartnersModule {}
