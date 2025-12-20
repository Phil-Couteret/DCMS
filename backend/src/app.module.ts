import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsentsModule } from './consents/consents.module';
import { AuditModule } from './audit/audit.module';
import { DsarModule } from './dsar/dsar.module';
import { BreachesModule } from './breaches/breaches.module';
// Import modules (to be created)
// import { BookingsModule } from './modules/bookings/bookings.module';
// import { CustomersModule } from './modules/customers/customers.module';
// import { EquipmentModule } from './modules/equipment/equipment.module';
// import { LocationsModule } from './modules/locations/locations.module';

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
    // BookingsModule,
    // CustomersModule,
    // EquipmentModule,
    // LocationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

