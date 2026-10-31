// Start Drishti's dev servers together.
//   node scripts/dev-all.mjs            Drishti (5173) + God's Eye (4173) + AI backend (8000, if its venv exists)
//   node scripts/dev-all.mjs gods-eye   God's Eye only
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const drishtiDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const godsEyeDir = path.resolve(drishtiDir, '..', 'gods-eye-view');
const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';

const children = [];
function run(name, command, args, options) {
  const child = spawn(command, args, { stdio: 'inherit', shell: isWindows, ...options });
  child.on('exit', code => {
    console.log(`[dev-all] ${name} exited (${code ?? 'signal'})`);
    if (code) shutdown(code);
  });
  children.push(child);
}
function shutdown(code = 0) {
  for (const child of children) if (!child.killed) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

if (!existsSync(path.join(godsEyeDir, 'node_modules'))) {
  console.error(`[dev-all] Install God's Eye first:  cd "${godsEyeDir}" && npm install`);
  process.exit(1);
}

// Only Drishti may frame God's Eye (see gods-eye-view/build/embed-framing.js).
run("God's Eye", npx, ['vite', '--port', '4173', '--strictPort'], {
  cwd: godsEyeDir,
  env: {
    ...process.env,
    GEV_EMBED_FRAME_ANCESTORS:
      process.env.GEV_EMBED_FRAME_ANCESTORS || 'http://localhost:5173 http://127.0.0.1:5173'
  }
});

if (process.argv[2] !== 'gods-eye') {
  run('Drishti', npx, ['vite', '--port', '5173', '--strictPort'], { cwd: drishtiDir });

  const python = path.join(drishtiDir, 'AI-Backend', '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python');
  if (existsSync(python)) {
    run('AI backend', python, ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'AI-Backend', '--reload', '--port', '8000'], {
      cwd: drishtiDir,
      shell: false
    });
  } else {
    console.log('[dev-all] AI backend venv not found; skipping it (see TRANSFER_CHECKLIST.md to set it up).');
  }
}
