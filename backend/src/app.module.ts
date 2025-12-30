import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  providers: [AppService],
})
export class AppModule {}

