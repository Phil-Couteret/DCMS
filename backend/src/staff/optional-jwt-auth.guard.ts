import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Lets the request through with or without a token. A valid token sets
// req.user; a missing or invalid one leaves it null instead of returning 401.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
