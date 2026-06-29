import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import {
  LoginDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account and trigger phone OTP' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the registration OTP' })
  async verify(@Body() dto: VerifyOtpDto) {
    await this.auth.verifyRegistration(dto);
    return { verified: true };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive a token pair' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token for a new pair' })
  async refresh(@Body() dto: RefreshDto) {
    const { accessToken, refreshToken } = await this.tokens.rotate(
      dto.refreshToken,
    );
    return { accessToken, refreshToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token (single device)' })
  async logout(@Body() dto: RefreshDto) {
    await this.tokens.revoke(dto.refreshToken);
    return { success: true };
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset OTP' })
  async requestReset(@Body() dto: RequestOtpDto) {
    await this.auth.requestPasswordReset(dto.destination);
    return { success: true };
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm reset with OTP and set new password' })
  async confirmReset(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { success: true };
  }
}
