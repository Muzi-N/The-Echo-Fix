import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { TokenService } from './token.service';

// Minimal fakes: we only exercise pure logic (TTL parsing, hashing
// determinism) without touching a real database or signing real JWTs.
function makeService(): TokenService {
  const jwt = {} as JwtService;
  const config = {
    get: (key: string) =>
      ({
        'jwt.accessSecret': 'a',
        'jwt.refreshTtl': '30d',
        'jwt.accessTtl': '900s',
      })[key],
  } as unknown as ConfigService;
  const repo = {} as Repository<RefreshToken>;
  return new TokenService(jwt, config, repo);
}

describe('TokenService', () => {
  const service = makeService();

  describe('parseTtlMs', () => {
    const cases: Array<[string, number]> = [
      ['900s', 900_000],
      ['15m', 900_000],
      ['1h', 3_600_000],
      ['30d', 2_592_000_000],
    ];
    it.each(cases)('parses %s to %d ms', (ttl, expected) => {
      // Access the private method via index signature for the test.
      const result = (service as unknown as {
        parseTtlMs: (t: string) => number;
      }).parseTtlMs(ttl);
      expect(result).toBe(expected);
    });

    it('falls back to 30 days on malformed input', () => {
      const result = (service as unknown as {
        parseTtlMs: (t: string) => number;
      }).parseTtlMs('garbage');
      expect(result).toBe(2_592_000_000);
    });
  });

  describe('hash', () => {
    it('is deterministic and 64 hex chars (sha256)', () => {
      const h = (service as unknown as { hash: (t: string) => string }).hash(
        'token',
      );
      const h2 = (service as unknown as { hash: (t: string) => string }).hash(
        'token',
      );
      expect(h).toBe(h2);
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
