import { spawn } from 'node:child_process';

process.env.ESLINT_USE_FLAT_CONFIG = 'false';

const args = process.argv.slice(2);

const child = spawn('eslint', args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 1));

