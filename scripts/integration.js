import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createApp } from '../server.js';
import { connect, initialize } from '../lib/database.js';
import { scenario } from '../scenario/banking.js';

// Use a fresh, explicitly test-only database; never drop the configured student DB.
process.env.MONGODB_DATABASE = `hw_test_${Date.now()}_${process.pid}`;
const { client, db } = await connect();
let server;
try {
  await initialize(db);
  assert.equal((await db.listCollections().toArray()).length, 10);
  const seed = spawn(process.execPath, ['scripts/seed.js'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let seedOutput = '';
  seed.stdout.on('data', chunk => { seedOutput += chunk; });
  seed.stderr.on('data', chunk => { seedOutput += chunk; });
  assert.equal((await once(seed, 'close'))[0], 0, seedOutput);
  for (const entity of scenario.entities) assert.equal(await db.collection(entity.name).countDocuments(), entity.rows.length);
  const secondSeed = spawn(process.execPath, ['scripts/seed.js'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let secondOutput = '';
  secondSeed.stdout.on('data', chunk => { secondOutput += chunk; });
  secondSeed.stderr.on('data', chunk => { secondOutput += chunk; });
  assert.notEqual((await once(secondSeed, 'close'))[0], 0);
  assert.match(secondOutput, /not empty/);
  for (const entity of scenario.entities) assert.equal(await db.collection(entity.name).countDocuments(), entity.rows.length);
  server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body, status = 200, headers = {}) {
    const response = await fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = response.status === 204 ? null : await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  const health = await request('/api/health');
  assert.equal(health.database, db.databaseName);
  assert.equal((await request('/api/scenario')).entities.length, 10);
  const html = await fetch(base);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /record-form/);
  for (const entity of scenario.entities) {
    const row = { ...entity.rows[0], id: 100 };
    for (const [key, field] of Object.entries(entity.fields)) {
      if (field.unique) row[key] = `TEST-${entity.name}`;
    }
    if (entity.name === 'account_holders') Object.assign(row, { account_id: 4, customer_id: 4 });
    await request(`/api/${entity.name}`, 'POST', row, 201);
    await request(`/api/${entity.name}`, 'POST', row, 409);
    assert.ok((await request(`/api/${entity.name}`)).some(r => r.id === 100));
    const updated = { ...row };
    const [changeKey, changeField] = Object.entries(entity.fields).find(([key, field]) => key !== 'id' && !field.ref);
    updated[changeKey] = changeField.enum ? changeField.enum.at(-1) :
      changeField.type === 'text' ? 'UPDATED' : changeField.type === 'date' ? '2025-07-01' : 42;
    await request(`/api/${entity.name}/100`, 'PUT', updated);
    assert.equal((await db.collection(entity.name).findOne({ id: 100 }))[changeKey], updated[changeKey]);
    await request(`/api/${entity.name}/100`, 'DELETE', undefined, 204);
    assert.equal(await db.collection(entity.name).findOne({ id: 100 }), null);
  }
  await request('/api/accounts', 'POST', { ...scenario.entities.find(e => e.name === 'accounts').rows[0], id: 90, branch_id: 999 }, 400);
  await request('/api/customers', 'POST', { id: 90, name: 'X' }, 400);
  await request('/api/customers', 'POST', { id: { $gt: 0 }, name: 'X', email: 'x@example.test' }, 400);
  await request('/api/transactions', 'POST', { ...scenario.entities.find(e => e.name === 'transactions').rows[0], id: 90, amount: 0.001 }, 400);
  await request('/api/accounts/1', 'PUT', { ...scenario.entities.find(e => e.name === 'accounts').rows[0], id: 2 }, 400);
  await request('/api/branches/1', 'DELETE', undefined, 409);
  await request('/api/account_holders', 'POST', { id: 90, account_id: 1, customer_id: 1, holder_role: 'JOINT' }, 409);
  await request('/api/customers/999', 'DELETE', undefined, 404);
  await request('/api/customers/01', 'DELETE', undefined, 400);
  await request('/api/customers/999', 'PUT', { id: 999, name: 'Nobody', email: 'nobody@example.test' }, 404);
  await request('/api/not_an_entity', 'GET', undefined, 404);
  await request('/api/toString', 'GET', undefined, 404);
  await request('/api/customers', 'POST', { id: 90, name: 'X', email: 'x@example.test' }, 403, { Origin: 'https://evil.example' });
  const malformed = await fetch(`${base}/api/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /Malformed/);
  const oversized = await fetch(`${base}/api/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(40000) }) });
  assert.equal(oversized.status, 413);
  await assert.rejects(db.collection('customers').insertOne({ id: 90, name: 'X' }), error => error.code === 121);
  await assert.rejects(db.collection('branches').insertOne({ id: 1, name: 'Duplicate', city: 'Test' }), error => error.code === 11000);
  const anotherConnection = await connect();
  try {
    assert.equal(await anotherConnection.db.collection('customers').countDocuments(), 4, 'Data persists independently of HTTP server state');
  } finally { await anotherConnection.client.close(); }
  console.log('PASS: real MongoDB seed, ten-collection CRUD, persistent reads, validation, unique keys, references, restricted deletion and HTTP errors.');
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await db.dropDatabase();
  await client.close();
}
