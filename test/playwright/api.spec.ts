import { test, expect } from '@playwright/test';

// ทั้ง 3 spec ต่อเนื่องกัน (token / roomId / bookingId ส่งต่อ) จึงรันแบบ serial
test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const user = {
  name: 'Playwright User',
  email: `pw.${stamp}@example.com`,
  password: 'password123',
};

let token = '';
let roomId = '';

test('1) list rooms — public catalogue returns a non-empty array', async ({ request }) => {
  const res = await request.get('/api/rooms');
  expect(res.ok()).toBeTruthy();
  const rooms = await res.json();
  expect(Array.isArray(rooms)).toBe(true);
  expect(rooms.length).toBeGreaterThan(0); // pipeline seed ห้องให้ก่อนรัน spec
  roomId = rooms[0].id;
});

test('2) register, log in and read own profile', async ({ request }) => {
  const reg = await request.post('/api/auth/register', { data: user });
  expect(reg.status()).toBe(201);

  const login = await request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(login.status()).toBe(200);
  token = (await login.json()).accessToken;
  expect(token).toBeTruthy();

  const me = await request.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(me.ok()).toBeTruthy();
  expect(await me.json()).toMatchObject({ email: user.email, role: 'customer' });
});

test('3) create a booking, see it in "my bookings", then cancel it', async ({ request }) => {
  const auth = { Authorization: `Bearer ${token}` };
  // วันที่ไกลในอนาคต + สุ่มเลื่อนวัน กันชนกับการจองอื่น (ยกเลิกท้ายเทสต์ ช่วงวันจะว่างอีกครั้ง)
  const day = 1 + Math.floor(Math.random() * 20);
  const checkIn = `2031-06-${String(day).padStart(2, '0')}`;
  const checkOut = `2031-06-${String(day + 2).padStart(2, '0')}`;

  const created = await request.post('/api/bookings', {
    headers: auth,
    data: { roomId, checkIn, checkOut, guests: 1 },
  });
  expect(created.status()).toBe(201);
  const booking = await created.json();
  expect(booking).toMatchObject({ roomId, status: 'pending', nights: 2 });

  const mine = await request.get('/api/bookings/me', { headers: auth });
  const ids = (await mine.json()).map((b: { id: string }) => b.id);
  expect(ids).toContain(booking.id);

  const cancelled = await request.post(`/api/bookings/${booking.id}/cancel`, { headers: auth });
  expect(cancelled.status()).toBe(200);
  expect((await cancelled.json()).status).toBe('cancelled');
});

test('4) protected route rejects a request without a token', async ({ request }) => {
  const res = await request.get('/api/bookings/me');
  expect(res.status()).toBe(401);
});
