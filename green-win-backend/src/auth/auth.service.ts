import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthErrorCodes } from './enums/auth-error-codes.enum';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException(AuthErrorCodes.EMAIL_ALREADY_EXISTS);
    }

    let organization = await this.organizationsService.findByName(dto.organizationName);

    if (!organization) {
      organization = await this.organizationsService.create({
        name: dto.organizationName,
        email: dto.email,
      });
    }

    const user = await this.usersService.createWithPassword({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      organization,
    });

    const tokens = await this.getTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: organization.id,
        organizationName: organization.name,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new BadRequestException(AuthErrorCodes.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await this.usersService.validatePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException(AuthErrorCodes.INVALID_CREDENTIALS);
    }

    const tokens = await this.getTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: (user as any)?.organization?.id,
        organizationName: (user as any)?.organization?.name,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new BadRequestException(AuthErrorCodes.INVALID_REFRESH_TOKEN);
    }

    const tokens = await this.getTokens(user.id, user.email);

    return tokens;
  }

  async getTokens(userId: string, email: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m') as any,
      }),
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d') as any,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
