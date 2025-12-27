import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtPartnerGuard extends AuthGuard('jwt-partner') {}
