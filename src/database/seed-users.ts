import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSourceInstance from '../config/data-source';
import { User, UserRole } from '../modules/users/user.entity';

/**
 * Populates `users` with the three demo accounts the login screen's "Demo
 * accounts" chips fill in (see frontend/lib/screens/auth/login_screen.dart),
 * matching frontend/lib/data/mock_data.dart exactly. Those chips only
 * autofill the email/password fields — actual sign-in still goes through the
 * real `/api/auth/login`, so without this seed the demo buttons fail with
 * "invalid email or password" against a real database that never had these
 * accounts in it.
 *
 * Matched by email and safe to run more than once, same as seed-rooms.
 *
 * Usage: npm run seed:users
 */
const BCRYPT_ROUNDS = 12;

const USERS: Array<{
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}> = [
  {
    name: 'System Admin',
    email: 'admin@hotel.com',
    phone: '+66800000001',
    password: 'admin123',
    role: UserRole.ADMIN,
  },
  {
    name: 'Front Desk Staff',
    email: 'staff@hotel.com',
    phone: '+66800000002',
    password: 'staff123',
    role: UserRole.STAFF,
  },
  {
    name: 'Jane Customer',
    email: 'customer@hotel.com',
    phone: '+66800000003',
    password: 'customer123',
    role: UserRole.CUSTOMER,
  },
];

async function seed(): Promise<void> {
  const dataSource = await dataSourceInstance.initialize();
  const repo = dataSource.getRepository(User);

  let created = 0;
  let skipped = 0;

  for (const spec of USERS) {
    const exists = await repo.findOne({ where: { email: spec.email } });
    if (exists) {
      skipped += 1;
      continue;
    }
    await repo.save(repo.create({
      name: spec.name,
      email: spec.email,
      phone: spec.phone,
      passwordHash: await bcrypt.hash(spec.password, BCRYPT_ROUNDS),
      role: spec.role,
    }));
    created += 1;
  }

  console.log(`Seed complete: ${created} user(s) created, ${skipped} already present.`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
