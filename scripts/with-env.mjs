// Cross-platform env wrapper (cross-env is not a dependency).
// Usage: node scripts/with-env.mjs KEY=value [KEY2=value2 ...] command [args...]
import { spawn } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const env = { ...process.env };
while (args.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) {
  const eq = args[0].indexOf('=');
  env[args[0].slice(0, eq)] = args[0].slice(eq + 1);
  args.shift();
}
// Make local binaries (next, ...) resolvable even when not launched through npm run
const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
env[pathKey] = path.resolve(process.cwd(), 'node_modules', '.bin') + path.delimiter + (env[pathKey] || '');
if (!args.length) {
  console.error('usage: node scripts/with-env.mjs KEY=value ... command [args...]');
  process.exit(2);
}
const child = spawn(args[0], args.slice(1), { stdio: 'inherit', env, shell: true });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
