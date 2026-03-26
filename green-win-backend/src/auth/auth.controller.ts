import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, RefreshResponseDto } from './dto/auth-response.dto';

import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

interface RequestWithPayload extends Request {
  user: JwtPayload;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Creates a new user account with email and password. Returns user data and JWT tokens.'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered. Returns user data with access and refresh tokens.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - email already exists or validation failed',
    schema: {
      example: {
        message: 'EMAIL_ALREADY_EXISTS',
        error: 'Bad Request',
        statusCode: 400
      }
    }
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticates user with email and password. Returns user data and JWT tokens.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in. Returns user data with access and refresh tokens.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credentials',
    schema: {
      example: {
        message: 'INVALID_CREDENTIALS',
        error: 'Bad Request',
        statusCode: 400
      }
    }
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Uses refresh token to get new access and refresh tokens. Send refresh token in Authorization header.'
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        message: 'INVALID_REFRESH_TOKEN',
        error: 'Unauthorized',
        statusCode: 401
      }
    }
  })
  async refresh(@Req() req: RequestWithPayload) {
    return this.authService.refreshTokens(req.user.sub);
  }
}
