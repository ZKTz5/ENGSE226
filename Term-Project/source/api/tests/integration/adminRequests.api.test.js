import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadSeed } from '../../src/services/shuttleDb.js';

const app = createApp();
const password = 'rmutl1234';
const future = (hours = 24) => new Date(Date.now() + hours * 3_600_000).toISOString();
const input = (hours = 24) => {
  const departureAt = future(hours);
  return {
    origin: 'Jed Yod', destination: 'Doi Saket', tripType: 'ONE_WAY', departureAt,
    returnAt: new Date(new Date(departureAt).getTime() + 2 * 3_600_000).toISOString(),
    passengerCount: 2, purpose: 'Administrative transport',
  };
};
async function login(email) {
  const { body } = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { Authorization: `Bearer ${body.token}` };
}
const userEmail = 'tan.khanit@live.rmutl.ac.th';
const adminEmail = 'admin@live.rmutl.ac.th';
beforeEach(async () => loadSeed());

describe('admin vehicle request review', () => {
  test('rejects regular users and unauthenticated requests', async () => {
    await request(app).get('/api/admin/vehicle-requests').expect(401);
    await request(app).get('/api/admin/vehicle-requests').set(await login(userEmail)).expect(403);
  });

  test('admin can register an actual vehicle and approve a pending request with it', async () => {
    const user = await login(userEmail);
    const admin = await login(adminEmail);
    const created = await request(app).post('/api/vehicle-requests').set(user).send(input()).expect(201);
    const vehicle = await request(app).post('/api/admin/vehicles').set(admin)
      .send({ code: 'RMUTL-VAN-01', capacity: 8 }).expect(201);
    expect(vehicle.body).toMatchObject({ code: 'RMUTL-VAN-01', capacity: 8, homeLocation: 'Jed Yod', active: 1 });
    const pending = await request(app).get('/api/admin/vehicle-requests?status=PENDING').set(admin).expect(200);
    expect(pending.body.map(({ id }) => id)).toContain(created.body.id);
    const approved = await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/approve`).set(admin)
      .send({ assignedVehicleId: vehicle.body.id }).expect(200);
    expect(approved.body).toMatchObject({ status: 'APPROVED', assignedVehicleId: vehicle.body.id, assignedVehicleCode: 'RMUTL-VAN-01' });
    expect((await request(app).get(`/api/vehicle-requests/${created.body.id}`).set(user).expect(200)).body.status).toBe('APPROVED');
  });

  test('rejects pending requests only with a reason and preserves the reason in owner detail', async () => {
    const user = await login(userEmail);
    const admin = await login(adminEmail);
    const created = await request(app).post('/api/vehicle-requests').set(user).send(input()).expect(201);
    await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/reject`).set(admin).send({}).expect(400);
    const rejected = await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/reject`).set(admin)
      .send({ rejectionReason: 'Vehicle unavailable for requested date' }).expect(200);
    expect(rejected.body).toMatchObject({ status: 'REJECTED', rejectionReason: 'Vehicle unavailable for requested date' });
    await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/approve`).set(admin).send({}).expect(409);
  });

  test('only staff can move an approved request to completed', async () => {
    const user = await login(userEmail);
    const admin = await login(adminEmail);
    const created = await request(app).post('/api/vehicle-requests').set(user).send(input()).expect(201);
    await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/complete`).set(admin).expect(409);
    const approved = await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/approve`).set(admin).send({}).expect(200);
    expect(approved.body.status).toBe('APPROVED');
    const completed = await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/complete`).set(admin).expect(200);
    expect(completed.body.status).toBe('COMPLETED');
    await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/complete`).set(admin).expect(409);
  });

  test('prevents assignment without a bounded service window and rejects overlapping approved assignments', async () => {
    const user = await login(userEmail);
    const admin = await login(adminEmail);
    const vehicle = await request(app).post('/api/admin/vehicles').set(admin).send({ code: 'VAN-A', capacity: 8 }).expect(201);
    const unbounded = await request(app).post('/api/vehicle-requests').set(user).send({ ...input(), returnAt: null }).expect(201);
    await request(app).patch(`/api/admin/vehicle-requests/${unbounded.body.id}/approve`).set(admin)
      .send({ assignedVehicleId: vehicle.body.id }).expect(409);

    const firstInput = input(48);
    const first = await request(app).post('/api/vehicle-requests').set(user).send(firstInput).expect(201);
    const second = await request(app).post('/api/vehicle-requests').set(user).send({
      ...input(49), departureAt: new Date(new Date(firstInput.departureAt).getTime() + 30 * 60_000).toISOString(),
      returnAt: new Date(new Date(firstInput.departureAt).getTime() + 90 * 60_000).toISOString(),
    }).expect(201);
    await request(app).patch(`/api/admin/vehicle-requests/${first.body.id}/approve`).set(admin)
      .send({ assignedVehicleId: vehicle.body.id }).expect(200);
    const conflict = await request(app).patch(`/api/admin/vehicle-requests/${second.body.id}/approve`).set(admin)
      .send({ assignedVehicleId: vehicle.body.id }).expect(409);
    expect(conflict.body.code).toBe('vehicle_assignment_overlap');
  });

  test('inactive vehicles cannot be assigned and user input cannot approve a request', async () => {
    const user = await login(userEmail);
    const admin = await login(adminEmail);
    const vehicle = await request(app).post('/api/admin/vehicles').set(admin).send({ code: 'VAN-INACTIVE', capacity: 8 }).expect(201);
    await request(app).patch(`/api/admin/vehicles/${vehicle.body.id}/active`).set(admin).send({ active: false }).expect(200);
    const created = await request(app).post('/api/vehicle-requests').set(user).send({ ...input(), status: 'APPROVED' }).expect(201);
    expect(created.body.status).toBe('PENDING');
    await request(app).patch(`/api/admin/vehicle-requests/${created.body.id}/approve`).set(admin)
      .send({ assignedVehicleId: vehicle.body.id }).expect(409);
  });
});
