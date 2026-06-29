import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { OtpChannel, OtpPurpose } from './otp-code.entity';
import { OtpService } from './otp.service';
import { TokenService, TokenPair } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
  ) {}

  private async hashPassword(plain: string): Promise<string> {
    // argon2id is the current OWASP-recommended password hash.
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async register(dto: RegisterDto): Promise<{ userId: string }> {
    const existing = await this.users.findOne({
      where: [{ username: dto.username }, { phoneNumber: dto.phoneNumber }],
    });
    if (existing) {
      throw new ConflictException('username or phone already registered');
    }

    const user = this.users.create({
      username: dto.username,
      phoneNumber: dto.phoneNumber,
      displayName: dto.displayName,
      email: dto.email ?? null,
      passwordHash: await this.hashPassword(dto.password),
    });
    await this.users.save(user);

    // Issue a verification code to the phone on registration.
    await this.otp.issue(
      dto.phoneNumber,
      OtpChannel.Phone,
      OtpPurpose.Registration,
    );

    return { userId: user.id };
  }

  async verifyRegistration(dto: VerifyOtpDto): Promise<void> {
    await this.otp.verify(dto.destination, OtpPurpose.Registration, dto.code);
    await this.users.update(
      { phoneNumber: dto.destination },
      { phoneVerified: true },
    );
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.username = :id OR u.phoneNumber = :id', { id: dto.identifier })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.tokens.issuePair(user.id, user.username, dto.deviceLabel);
  }

  async requestPasswordReset(destination: string): Promise<void> {
    // Do not reveal whether the account exists. Always issue if a user matches,
    // otherwise silently succeed.
    const user = await this.users.findOne({
      where: { phoneNumber: destination },
    });
    if (user) {
      await this.otp.issue(
        destination,
        OtpChannel.Phone,
        OtpPurpose.PasswordReset,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    await this.otp.verify(dto.destination, OtpPurpose.PasswordReset, dto.code);
    const passwordHash = await this.hashPassword(dto.newPassword);
    await this.users.update(
      { phoneNumber: dto.destination },
      { passwordHash },
    );
    // Invalidate all existing sessions after a password reset.
    const user = await this.users.findOne({
      where: { phoneNumber: dto.destination },
    });
    if (user) {
      await this.tokens.revokeAllForUser(user.id);
    }
  }
}
