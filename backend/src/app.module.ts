import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import { BonosModule } from './bonos/bonos.module.js';
import { BoatsModule } from './boats/boats.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { BreachesModule } from './breaches/breaches.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DiveLogsModule } from './dive-logs/dive-logs.module.js';
import { DiveSitesModule } from './dive-sites/dive-sites.module.js';
import { EquipmentModule } from './equipment/equipment.module.js';
import { FinancialModule } from './financial/financial.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { MailModule } from './mail/mail.module.js';
import { PartnersModule } from './partners/partners.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StaffModule } from './staff/staff.module.js';
import { StaysModule } from './stays/stays.module.js';
import { TanksModule } from './tanks/tanks.module.js';
import { SuperadminModule } from './superadmin/superadmin.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { TripsModule } from './trips/trips.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Applied per route with ThrottlerGuard, never globally. The limits here are
    // defaults that each route overrides with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    TenantModule,
    UsersModule,
    BreachesModule,
    AuthModule,
    CustomersModule,
    BoatsModule,
    DiveSitesModule,
    EquipmentModule,
    TanksModule,
    BonosModule,
    StaffModule,
    BookingsModule,
    DiveLogsModule,
    BillingModule,
    FinancialModule,
    StaysModule,
    PartnersModule,
    TripsModule,
    SettingsModule,
    SuperadminModule,
    LocationsModule,
    MailModule,
    InvitationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
