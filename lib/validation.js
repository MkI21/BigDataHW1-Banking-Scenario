export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function validate(entity, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Expected a JSON object.');
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(entity.fields, key)) throw new InputError(`Unknown field: ${key}`);
  }
  const result = {};
  for (const [key, field] of Object.entries(entity.fields)) {
    const value = input[key];
    if (value === undefined || value === null) {
      if (field.required) throw new InputError(`${field.label} is required.`);
      result[key] = null;
      continue;
    }
    let valid;
    if (field.type === 'text') {
      valid = typeof value === 'string' && value.trim().length > 0 && value === value.trim() && value.length <= field.max;
    } else if (field.type === 'date') {
      valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        value.slice(0, 4) !== '0000' && Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value;
    } else {
      valid = typeof value === 'number' && Number.isFinite(value) &&
        (field.type !== 'integer' || Number.isSafeInteger(value)) &&
        (field.type !== 'money' || Number(value.toFixed(2)) === value) &&
        (field.min === undefined || (field.exclusiveMin ? value > field.min : value >= field.min)) &&
        (field.max === undefined || value <= field.max);
    }
    if (!valid || (field.enum && !field.enum.includes(value))) throw new InputError(`Invalid ${field.label}.`);
    result[key] = value;
  }
  return result;
}

export async function validateReferences(db, entity, record) {
  for (const [key, field] of Object.entries(entity.fields)) {
    if (field.ref && record[key] !== null && !await db.collection(field.ref).findOne({ id: record[key] })) {
      throw new InputError(`${field.label} references a missing ${field.ref} record.`);
    }
  }
}

export function checkScenario(scenario) {
  const names = new Set();
  const identifier = /^[a-z][a-z0-9_]*$/;
  if (!/^[A-Z][A-Z0-9_]*$/.test(scenario.prefix)) throw new Error('Invalid SQL prefix.');
  for (const entity of scenario.entities) {
    if (!identifier.test(entity.name) || names.has(entity.name) || (scenario.prefix + entity.name).length > 30) throw new Error('Invalid/duplicate entity name.');
    if (!entity.fields[entity.display] || entity.fields.id?.type !== 'integer') throw new Error(`Invalid identity/display: ${entity.name}`);
    const ids = new Set();
    for (const [key, field] of Object.entries(entity.fields)) {
      if (!identifier.test(key) || key.length > 30 || !['text', 'integer', 'money', 'date'].includes(field.type)) throw new Error(`Invalid field: ${key}`);
      if (field.ref && !names.has(field.ref)) throw new Error(`References must point to an earlier entity: ${field.ref}`);
    }
    const groups = [...Object.entries(entity.fields).filter(([, f]) => f.unique).map(([key]) => [key]), ...entity.unique];
    for (const row of entity.rows) {
      validate(entity, row);
      if (ids.has(row.id)) throw new Error(`Duplicate ID: ${entity.name}`);
      ids.add(row.id);
      for (const keys of groups) {
        if (!keys.length || keys.some(key => !entity.fields[key])) throw new Error(`Invalid unique key: ${entity.name}`);
        if (entity.rows.filter(r => keys.every(key => r[key] === row[key])).length !== 1) throw new Error(`Duplicate ${keys.join(', ')}`);
      }
      for (const [key, field] of Object.entries(entity.fields)) {
        if (field.ref && row[key] != null && !scenario.entities.find(e => e.name === field.ref).rows.some(r => r.id === row[key])) throw new Error(`Missing seed reference: ${key}`);
      }
    }
    names.add(entity.name);
  }
}
