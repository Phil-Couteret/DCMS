import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface PartnerLoginDto {
  email?: string;
  apiKey?: string;
  apiSecret: string;
}

export interface PartnerJwtPayload {
  partnerId: string;
  apiKey: string;
  type: 'partner';
}

@Injectable()
export class PartnerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validatePartner(identifier: string, apiSecret: string) {
    // Identifier can be either email or API key
    let partner = null;
    
    // Try email first (more user-friendly)
    if (identifier.includes('@')) {
      partner = await this.prisma.partners.findUnique({
        where: { contact_email: identifier },
      });
    }
    
    // If not found by email, try API key
    if (!partner) {
      partner = await this.prisma.partners.findUnique({
        where: { api_key: identifier },
      });
    }

    if (!partner) {
      throw new UnauthorizedException(`Invalid credentials: Partner not found with ${identifier.includes('@') ? 'email' : 'API key'} "${identifier}"`);
    }

    if (!partner.is_active) {
      throw new UnauthorizedException('Partner account is inactive');
    }

    // Verify API secret
    const isValidSecret = await bcrypt.compare(apiSecret, partner.api_secret_hash);
    if (!isValidSecret) {
      throw new UnauthorizedException('Invalid credentials: API secret does not match');
    }

    return partner;
  }

  async login(loginDto: PartnerLoginDto) {
    // Support both email and API key login
    const identifier = loginDto.email || loginDto.apiKey;
    if (!identifier || !loginDto.apiSecret) {
      throw new UnauthorizedException('Email/API Key and Secret are required');
    }

    const partner = await this.validatePartner(identifier, loginDto.apiSecret);

    const payload: PartnerJwtPayload = {
      partnerId: partner.id,
      apiKey: partner.api_key,
      type: 'partner',
    };

    return {
      access_token: this.jwtService.sign(payload),
      partner: {
        id: partner.id,
        name: partner.name,
        companyName: partner.company_name,
        email: partner.contact_email,
        commissionRate: partner.commission_rate,
        allowedLocations: partner.allowed_locations,
      },
    };
  }

  async validatePartnerFromToken(payload: PartnerJwtPayload) {
    const partner = await this.prisma.partners.findUnique({
      where: { id: payload.partnerId },
    });

    if (!partner || !partner.is_active) {
      throw new UnauthorizedException('Partner not found or inactive');
    }

    return partner;
  }
}
