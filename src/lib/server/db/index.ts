import { mkdirSync } from 'node:fs';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { HIT_METHODS } from '$lib/hit';
import * as schema from './schema';

const MIGRATIONS = 'drizzle';

type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

async function connect(): Promise<Db> {
	let db: Db;
	if (env.DATABASE_URL) {
		const client = postgres(env.DATABASE_URL, { max: 10 });
		const pg = drizzlePostgres(client, { schema });
		await migratePostgres(pg, { migrationsFolder: MIGRATIONS });
		db = pg as unknown as Db;
	} else {
		const dir = env.PGLITE_DIR || './data/pglite';
		mkdirSync(dir, { recursive: true });
		const client = await PGlite.create(dir);
		db = drizzlePglite(client, { schema });
		await migratePglite(db, { migrationsFolder: MIGRATIONS });
	}

	await db
		.insert(schema.hitMethod)
		.values(
			HIT_METHODS.map((m, i) => ({
				key: m.key,
				name: m.name,
				color: m.color,
				description: m.description,
				position: i
			}))
		)
		.onConflictDoNothing();

	return db;
}

// Survive dev-server HMR: PGlite must only ever open its data dir once per process.
const g = globalThis as unknown as { __workoutDb?: Promise<Db> };

export const db: Db = building ? (null as unknown as Db) : await (g.__workoutDb ??= connect());
export { schema };
