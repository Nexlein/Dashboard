import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const secretFile = process.env.AUTH_SECRET_FILE ?? '/run/dashboard/auth-secret';
await mkdir(path.dirname(secretFile), { recursive: true });
try {
    await writeFile(secretFile, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
    console.log('Local authentication secret created.');
} catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('Local authentication secret preserved.');
}
