import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthErrorCodes } from '../enums/auth-error-codes.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info instanceof Error || err || !user) {
      throw new UnauthorizedException(AuthErrorCodes.INVALID_ACCESS_TOKEN);
    }

    return user;
  }
}
