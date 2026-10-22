import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { scenario, byName } from '../scenario/banking.js';
import { validate, checkScenario, InputError } from '../lib/validation.js';
import { artifacts } from '../scripts/generate.js';

test('exactly ten related entities; valid unique seed and references', () => {
  assert.equal(scenario.entities.length, 10);
  checkScenario(scenario);
  const connected = new Set();
  for (const entity of scenario.entities) {
    for (const field of Object.values(entity.fields)) {
      if (field.ref) { connected.add(entity.name); connected.add(field.ref); }
    }
  }
  assert.equal(connected.size, 10);
  assert.equal(scenario.entities.reduce((sum, e) => sum + e.rows.length, 0), 35);
});

test('generated schema, seed, verification, guarded reset and ERD stay in sync', async () => {
  const output = artifacts();
  for (const [path, expected] of Object.entries(output)) assert.equal(await readFile(path, 'utf8'), expected, path);
  assert.equal((output['sql/01_schema.sql'].match(/CREATE TABLE /g) || []).length, 10);
  assert.equal((output['sql/02_seed.sql'].match(/INSERT INTO /g) || []).length, 35);
  assert.equal((output['docs/erd.md'].match(/ PK\n/g) || []).length, 10);
  assert.match(output['sql/99_reset_OPTIONAL.sql'], /confirmation VARCHAR2\(30\) := 'NO'/);
  assert.doesNotMatch(output['sql/01_schema.sql'], /DROP TABLE/);
  assert.match(output['sql/02_seed.sql'], /ROLLBACK;\n    RAISE;/);
});

test('validation rejects malformed, missing, unknown and out-of-range fields', () => {
  const customer = byName.customers.rows[0];
  for (const value of [null, [], 'text', {}, { ...customer, id: '1' }, { ...customer, id: 0 },
    { ...customer, id: 1.2 }, { ...customer, id: 2147483648 }, { ...customer, name: '  ' },
    { ...customer, name: ' Ana ' }, { ...customer, email: 'a'.repeat(121) },
    { ...customer, admin: true }, { ...customer, name: { $ne: null } }]) {
    assert.throws(() => validate(byName.customers, value), InputError);
  }
  assert.deepEqual(validate(byName.customers, customer), customer);
});

test('money, enums, real calendar dates and optional references are validated', () => {
  const row = byName.transactions.rows[0];
  for (const patch of [{ amount: -1 }, { amount: 0 }, { amount: 1.001 }, { amount: 1.000000001 }, { amount: Infinity },
    { amount: 1e10 }, { kind: 'TRANSFER' }, { occurred_on: '2025-02-29' },
    { occurred_on: '2025-13-01' }, { occurred_on: '0000-01-01' }, { employee_id: 0 }]) {
    assert.throws(() => validate(byName.transactions, { ...row, ...patch }), InputError);
  }
  assert.equal(validate(byName.transactions, { ...row, employee_id: undefined }).employee_id, null);
  assert.equal(validate(byName.transactions, { ...row, occurred_on: '2024-02-29' }).occurred_on, '2024-02-29');
  assert.equal(validate(byName.transactions, { ...row, amount: 0.29 }).amount, 0.29);
});

test('ten queries each use exactly four JOINs and return the intended seed results', async () => {
  const source = await readFile('sql/03_queries.sql', 'utf8');
  const statements = source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 10);
  for (const statement of statements) assert.equal((statement.match(/\bJOIN\b/gi) || []).length, 4);
  for (const kind of ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN']) assert.ok(source.includes(kind));
  // SQLite checks portable join behavior, NOT Oracle syntax or Oracle Academy access.
  const db = new DatabaseSync(':memory:');
  db.function('NVL', (a, b) => a ?? b);
  db.function('TO_CHAR', (value, format) => value);
  try {
    for (const entity of scenario.entities) {
      const keys = Object.keys(entity.fields);
      db.exec(`CREATE TABLE HW_${entity.name} (${keys.join(', ')});`);
      const insert = db.prepare(`INSERT INTO HW_${entity.name} VALUES (${keys.map(() => '?').join(', ')});`);
      for (const row of entity.rows) insert.run(...keys.map(key => row[key]));
    }
    const results = statements.map(statement => db.prepare(statement).all());
    assert.deepEqual(results.map(rows => rows.length), [5, 6, 6, 4, 3, 3, 5, 6, 5, 4]);
    assert.ok(results[1].some(r => r.customer === 'Victor Radu' && r.account_number === '(no account)'));
    assert.ok(results[2].some(r => r.branch === 'New Town' && r.account_number === null));
    assert.equal(results[3].filter(r => r.handled_by === 'Self-service').length, 2);
    assert.ok(results[6].some(r => r.loan_type === 'Education' && r.loan_id === null));
    assert.ok(results[6].some(r => r.loan_id === 2 && r.payment_id === null));
    assert.ok(results[7].some(r => r.account_type === 'Student' && r.account_number === null));
    assert.deepEqual(results[9].map(r => [r.transaction_count, r.payment_count]), [[2, 2], [1, 0], [0, 1], [1, 0]]);
  } finally { db.close(); }
});
