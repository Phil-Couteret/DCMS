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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

