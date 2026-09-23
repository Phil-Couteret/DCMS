import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import { BoatsModule } from './boats/boats.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DiveLogsModule } from './dive-logs/dive-logs.module.js';
import { DiveSitesModule } from './dive-sites/dive-sites.module.js';
import { EquipmentModule } from './equipment/equipment.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StaffModule } from './staff/staff.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Applied per route with ThrottlerGuard, never globally. The limits here are
    // defaults that each route overrides with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    BoatsModule,
    DiveSitesModule,
    EquipmentModule,
    StaffModule,
    BookingsModule,
    DiveLogsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
