import express from 'express';
import { fileURLToPath } from 'node:url';
import { scenario, byName } from './scenario/banking.js';
import { connect, initialize } from './lib/database.js';
import { InputError, validate, validateReferences } from './lib/validation.js';

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (!['GET', 'HEAD'].includes(req.method) && req.get('Origin') && req.get('Origin') !== `${req.protocol}://${req.get('Host')}`) {
      return res.status(403).json({ error: 'Cross-origin writes are not allowed.' });
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', async (req, res) => {
    await db.command({ ping: 1 });
    res.json({ status: 'ok', database: db.databaseName });
  });
  app.get('/api/scenario', (req, res) => {
    res.json({ title: scenario.title, entities: scenario.entities.map(({ rows, ...entity }) => entity) });
  });
  app.use('/api/:entity', (req, res, next) => {
    if (!Object.hasOwn(byName, req.params.entity)) return res.status(404).json({ error: 'Unknown entity.' });
    req.entity = byName[req.params.entity];
    next();
  });
  app.get('/api/:entity', async (req, res) => {
    const rows = await db.collection(req.entity.name).find({}, { projection: { _id: 0 } }).sort({ id: 1 }).limit(501).toArray();
    if (rows.length > 500) throw new InputError('Student UI supports up to 500 records per collection. Use MongoDB tools for larger datasets.', 409);
    res.json(rows);
  });
  // shortcut: one local server serializes writes; use transactions for multi-server deployments.
  let writing = Promise.resolve();
  function serialize(handler) {
    return (req, res, next) => {
      const operation = writing.then(() => handler(req, res));
      writing = operation.catch(() => {});
      operation.catch(next);
    };
  }
  app.post('/api/:entity', serialize(async (req, res) => {
    const row = validate(req.entity, req.body);
    await validateReferences(db, req.entity, row);
    await db.collection(req.entity.name).insertOne({ ...row });
    res.status(201).json(row);
  }));
  function parseId(value) {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new InputError('Invalid record ID.');
    return Number(value);
  }
  app.put('/api/:entity/:id', serialize(async (req, res) => {
    const id = parseId(req.params.id);
    const row = validate(req.entity, req.body);
    if (row.id !== id) throw new InputError('IDs cannot be changed.');
    await validateReferences(db, req.entity, row);
    const result = await db.collection(req.entity.name).replaceOne({ id }, row);
    if (!result.matchedCount) throw new InputError('Record not found.', 404);
    res.json(row);
  }));
  app.delete('/api/:entity/:id', serialize(async (req, res) => {
    const id = parseId(req.params.id);
    for (const entity of scenario.entities) {
      for (const [key, field] of Object.entries(entity.fields)) {
        if (field.ref === req.entity.name && await db.collection(entity.name).findOne({ [key]: id })) {
          throw new InputError(`Cannot delete: ${entity.label} still references this record. Remove or reassign child records first.`, 409);
        }
      }
    }
    const result = await db.collection(req.entity.name).deleteOne({ id });
    if (!result.deletedCount) throw new InputError('Record not found.', 404);
    res.status(204).end();
  }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof InputError) return res.status(error.status).json({ error: error.message });
    if (error.code === 11000) return res.status(409).json({ error: 'ID or another unique value already exists.' });
    if (error.code === 121) return res.status(400).json({ error: 'Document does not meet database validation rules.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    console.error(error);
    res.status(503).json({ error: 'Database or server failure. Check the server terminal.' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { client, db } = await connect();
    try {
      await initialize(db);
      const host = process.env.HOST || '127.0.0.1';
      const port = Number(process.env.PORT || 3000);
      const server = createApp(db).listen(port, host, () => console.log(`Banking app: http://${host}:${port}`));
      server.on('error', async error => { console.error(error); await client.close(); process.exitCode = 1; });
      for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => server.close(async () => { await client.close(); }));
      }
    } catch (error) {
      await client.close();
      throw error;
    }
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exitCode = 1;
  }
}
