import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BoatsModule } from './boats/boats.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DiveSitesModule } from './dive-sites/dive-sites.module.js';
import { EquipmentModule } from './equipment/equipment.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StaffModule } from './staff/staff.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    BoatsModule,
    DiveSitesModule,
    EquipmentModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
