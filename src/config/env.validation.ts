import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Strongly typed, validated environment schema. The application refuses to
 * boot if required variables are missing or malformed, which prevents a
 * misconfigured deploy from coming up in a half-broken state.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL = '900s';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL = '30d';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = '*';

  @IsString()
  @IsOptional()
  OTP_DRIVER = 'console';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    // Implicit conversion has already coerced types; validate the result.
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }
  return validated;
}
