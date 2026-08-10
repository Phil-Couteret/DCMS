import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { buildPinoHttpOptions } from './common/logger/pino-http.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConsentsModule } from './consents/consents.module';
import { AuditModule } from './audit/audit.module';
import { DsarModule } from './dsar/dsar.module';
import { BreachesModule } from './breaches/breaches.module';
import { BookingsModule } from './bookings/bookings.module';
import { CustomersModule } from './customers/customers.module';
import { EquipmentModule } from './equipment/equipment.module';
import { LocationsModule } from './locations/locations.module';
import { BoatsModule } from './boats/boats.module';
import { StatisticsModule } from './statistics/statistics.module';
import { DiveSitesModule } from './dive-sites/dive-sites.module';
import { GovernmentBonosModule } from './government-bonos/government-bonos.module';
import { StaffModule } from './staff/staff.module';
import { BoatPrepsModule } from './boat-preps/boat-preps.module';
import { SettingsModule } from './settings/settings.module';
import { PartnersModule } from './partners/partners.module';
import { PartnerModule } from './partner/partner.module';
import { PartnerInvoicesModule } from './partner-invoices/partner-invoices.module';
import { PartnerAuthModule } from './partner-auth/partner-auth.module';
import { CustomerBillsModule } from './customer-bills/customer-bills.module';
import { UsersModule } from './users/users.module';
import { DataRetentionModule } from './data-retention/data-retention.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    TenantModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Phase 6.9 (roadmap item 9): structured JSON logging. Replaces Nest's
    // default pretty-printed console logger app-wide - every `new
    // Logger(ctx)` call anywhere in the codebase (services, the global
    // exception filter, framework bootstrap messages) is automatically
    // routed through this once `app.useLogger(app.get(Logger))` is called
    // in main.ts, since Nest's built-in Logger delegates to whatever
    // logger was registered via `useLogger`. No call sites needed to
    // change. In production this writes one JSON object per log line to
    // stdout - matching how container logs are already collected (`docs`
    // notes this was previously just unstructured stdout) and ready to
    // feed into a log aggregator (Loki, ELK, etc.) later without another
    // code change. Outside production, `pino-pretty` renders the same
    // JSON as readable colored lines instead.
    LoggerModule.forRoot({
      pinoHttp: buildPinoHttpOptions(),
    }),
    // Baseline rate limiting for every route (100 requests / 60s per IP).
    // Tighter, endpoint-specific limits (e.g. login) are set via the
    // @Throttle() decorator on top of this default - see users.controller.ts.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConsentsModule,
    AuditModule,
    DsarModule,
    BreachesModule,
    BookingsModule,
    CustomersModule,
    EquipmentModule,
    LocationsModule,
    BoatsModule,
    StatisticsModule,
    DiveSitesModule,
    GovernmentBonosModule,
    StaffModule,
    BoatPrepsModule,
    SettingsModule,
    PartnersModule,
    PartnerModule,
    PartnerInvoicesModule,
    PartnerAuthModule,
    CustomerBillsModule,
    UsersModule,
    DataRetentionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth guard: every route requires a valid admin JWT by default.
    // Routes that legitimately need no auth, or that enforce their own
    // alternative auth (partner API key, partner JWT), must be marked
    // @Public() explicitly rather than relying on the absence of a guard.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Rate limiting, applied globally alongside the auth guard above.
    // Nest runs multiple APP_GUARD providers in registration order.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

