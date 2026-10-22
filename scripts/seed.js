import { connect, initialize } from '../lib/database.js';
import { scenario } from '../scenario/banking.js';
import { validate, validateReferences } from '../lib/validation.js';

const { client, db } = await connect();
try {
  // Never wipe or overwrite a student's existing documents.
  for (const entity of scenario.entities) {
    if (await db.collection(entity.name).countDocuments()) throw new Error(`${entity.name} is not empty. Seed refused; existing data is unchanged.`);
  }
  await initialize(db);
  for (const entity of scenario.entities) {
    for (const row of entity.rows) {
      validate(entity, row);
      await validateReferences(db, entity, row);
      await db.collection(entity.name).insertOne({ ...row });
    }
    console.log(`${entity.name}: ${entity.rows.length} documents`);
  }
  console.log('Seed complete. Start the app with npm start.');
} finally {
  await client.close();
}
