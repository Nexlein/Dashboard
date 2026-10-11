import { spawnSync } from 'node:child_process';
import { dockerEnvironment } from './environment.mjs';

Object.assign(process.env, dockerEnvironment(process.env));
if (process.argv.includes('--seed')) {
    await import('../prisma/seed.ts');
} else {
    const migration = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });
    if (migration.error) throw migration.error;
    if (migration.status !== 0) process.exit(migration.status ?? 1);
    await import('../src/server.ts');
}
