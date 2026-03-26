import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthErrorCodes } from '../enums/auth-error-codes.enum';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err: any, user: any, info: any) {
    if (info instanceof Error || err || !user) {
      throw new UnauthorizedException(AuthErrorCodes.INVALID_REFRESH_TOKEN);
    }

    return user;
  }
}
