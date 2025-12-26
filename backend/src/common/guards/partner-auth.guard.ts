import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnerAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get API key from header
    const apiKey = request.headers['x-api-key'] || request.headers['api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Find partner by API key
    const partner = await this.prisma.partners.findUnique({
      where: { api_key: apiKey },
    });

    if (!partner) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!partner.is_active) {
      throw new ForbiddenException('Partner account is inactive');
    }

    // Verify API secret if provided (for more secure authentication)
    const apiSecret = request.headers['x-api-secret'] || request.headers['api-secret'];
    if (apiSecret) {
      const isValidSecret = await bcrypt.compare(apiSecret, partner.api_secret_hash);
      if (!isValidSecret) {
        throw new UnauthorizedException('Invalid API secret');
      }
    }

    // Attach partner to request for use in controllers
    request.partner = partner;

    return true;
  }
}

