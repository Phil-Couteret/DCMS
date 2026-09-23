import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAdminStrategy } from './jwt-admin.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { getRequiredJwtSecret } from '../config/jwt-secret.util';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: getRequiredJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtAdminStrategy, PrismaService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
