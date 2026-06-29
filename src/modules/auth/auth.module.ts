import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from '../../common/guards/jwt.strategy';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpCode } from './otp-code.entity';
import {
  ConsoleOtpDriver,
  OTP_DELIVERY_DRIVER,
} from './otp-delivery.driver';
import { OtpService } from './otp.service';
import { RefreshToken } from './refresh-token.entity';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, OtpCode]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    JwtStrategy,
    {
      // Driver selection is config-driven. Only the console driver ships in
      // milestone one; a real provider binds here later.
      provide: OTP_DELIVERY_DRIVER,
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => new ConsoleOtpDriver(),
    },
  ],
  exports: [TokenService],
})
export class AuthModule {}
