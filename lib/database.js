import { MongoClient } from 'mongodb';
import { scenario } from '../scenario/banking.js';
import { checkScenario } from './validation.js';

export async function connect() {
  checkScenario(scenario);
  const name = process.env.MONGODB_DATABASE || 'hw_banking';
  if (!/^hw_[a-z0-9_]+$/.test(name)) throw new Error('Use a dedicated database name beginning hw_.');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(name);
    await db.command({ ping: 1 });
    return { client, db };
  } catch (error) {
    await client.close();
    throw error;
  }
}

export async function initialize(db) {
  const existing = new Set((await db.listCollections().toArray()).map(c => c.name));
  for (const entity of scenario.entities) {
    const properties = { _id: { bsonType: 'objectId' } };
    for (const [key, field] of Object.entries(entity.fields)) {
      const types = field.type === 'integer' || field.type === 'money' ? ['int', 'long', 'double', 'decimal'] : ['string'];
      const rule = { bsonType: field.required ? types : [...types, 'null'] };
      if (field.type === 'text') Object.assign(rule, { minLength: 1, maxLength: field.max });
      if (field.type === 'date') rule.pattern = '^\\d{4}-\\d{2}-\\d{2}$';
      if (field.min !== undefined) Object.assign(rule, { minimum: field.min, exclusiveMinimum: !!field.exclusiveMin });
      if (field.max !== undefined) rule.maximum = field.max;
      if (field.type === 'integer') rule.multipleOf = 1;
      if (field.enum) rule.enum = field.required ? field.enum : [...field.enum, null];
      properties[key] = rule;
    }
    const validator = { $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: Object.entries(entity.fields).filter(([, f]) => f.required).map(([key]) => key), properties
    } };
    if (!existing.has(entity.name)) await db.createCollection(entity.name, { validator });
    else await db.command({ collMod: entity.name, validator, validationLevel: 'strict', validationAction: 'error' });
    for (const [key, field] of Object.entries(entity.fields)) {
      if (key === 'id' || field.unique) await db.collection(entity.name).createIndex({ [key]: 1 }, { unique: true });
      else if (field.ref) await db.collection(entity.name).createIndex({ [key]: 1 });
    }
    for (const keys of entity.unique) {
      await db.collection(entity.name).createIndex(Object.fromEntries(keys.map(key => [key, 1])), { unique: true });
    }
  }
}
