import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const conn = process.env.PG_CONN;
if (!conn) {
  console.error('PG_CONN environment variable is required');
  process.exit(2);
}

const sqlPath = path.resolve(process.cwd(), 'server', 'migrations', '001_init.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Migration file not found:', sqlPath);
  process.exit(3);
}
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({ connectionString: conn });

(async () => {
  try {
    await client.connect();
    console.log('Connected to Postgres, running migration...');
    await client.query(sql);
    console.log('Migration applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();
