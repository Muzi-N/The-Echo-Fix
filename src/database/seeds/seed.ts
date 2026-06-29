import 'reflect-metadata';
import * as argon2 from 'argon2';
import dataSource from '../data-source';
import { User } from '../../modules/users/user.entity';

/**
 * Idempotent local seed. Creates two demo users if they do not already exist.
 * Never run against production data.
 */
async function seed() {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);

  const demo = [
    { username: 'muzi', phoneNumber: '+27821234567', displayName: 'Muzi Nkosi' },
    { username: 'lihle', phoneNumber: '+27829999999', displayName: 'Lihle' },
  ];

  const passwordHash = await argon2.hash('StrongPassw0rd!', {
    type: argon2.argon2id,
  });

  for (const d of demo) {
    const existing = await users.findOne({
      where: { username: d.username },
    });
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`skip: ${d.username} already exists`);
      continue;
    }
    await users.save(
      users.create({ ...d, passwordHash, phoneVerified: true }),
    );
    // eslint-disable-next-line no-console
    console.log(`created: ${d.username}`);
  }

  await dataSource.destroy();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
