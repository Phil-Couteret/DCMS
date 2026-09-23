import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route (or entire controller) as exempt from the global JwtAuthGuard.
 * Use only for endpoints that either need no auth (login, health check) or
 * that enforce their own alternative auth mechanism (e.g. PartnerAuthGuard,
 * JwtPartnerGuard) via @UseGuards at the same or narrower scope.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
