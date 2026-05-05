#!/usr/bin/env node
// Bootstrap del kit "vite-ftp-deploy" en un proyecto Vite.
// Uso: desde la raíz del proyecto destino, ejecuta:
//   node "<ruta-al-kit>/install.mjs"
// El script resuelve sus propias rutas vía import.meta.url, así que funciona
// desde cualquier ubicación del kit.

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  cpSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = process.cwd();
const KIT_SCRIPTS = join(__dirname, 'scripts');
const KIT_ENV_EXAMPLE = join(__dirname, '.env.local.example');

const log = (msg) => console.log(`\x1b[36m${msg}\x1b[0m`);
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`);

if (TARGET === __dirname) {
  console.error('✗ No ejecutes el install.mjs dentro del kit mismo.');
  console.error('  Cambia a la raíz del proyecto Vite destino y ejecuta:');
  console.error(`  node "${join(__dirname, 'install.mjs')}"`);
  process.exit(1);
}

// 1. Verificar que es un proyecto Vite
const pkgPath = join(TARGET, 'package.json');
if (!existsSync(pkgPath)) {
  console.error('✗ No se encontró package.json en', TARGET);
  console.error('  Ejecuta esto desde la raíz de tu proyecto Vite.');
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
if (!deps.vite) {
  warn('No se detectó "vite" en dependencies. Continúo igual, pero esto está pensado para proyectos Vite.');
}

// 2. Copiar scripts/
log('▸ Copiando scripts/');
const targetScripts = join(TARGET, 'scripts');
mkdirSync(targetScripts, { recursive: true });
cpSync(KIT_SCRIPTS, targetScripts, { recursive: true });
ok('scripts/deploy-build.mjs y scripts/deploy-publish.mjs');

// 3. Actualizar package.json (scripts)
log('▸ Actualizando package.json');
pkg.scripts = pkg.scripts || {};
let scriptsAdded = 0;
if (!pkg.scripts.deploy) {
  pkg.scripts.deploy = 'node scripts/deploy-build.mjs';
  scriptsAdded++;
}
if (!pkg.scripts.publish) {
  pkg.scripts.publish = 'node --env-file=.env.local scripts/deploy-publish.mjs';
  scriptsAdded++;
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
ok(`${scriptsAdded} script(s) agregado(s) (deploy, publish)`);

// 4. Instalar basic-ftp si no está
if (!deps['basic-ftp']) {
  log('▸ Instalando basic-ftp');
  execSync('npm install basic-ftp', { cwd: TARGET, stdio: 'inherit' });
  ok('basic-ftp instalado');
} else {
  ok('basic-ftp ya está instalado');
}

// 5. Crear .env.local desde el template si no existe
const envLocal = join(TARGET, '.env.local');
if (!existsSync(envLocal)) {
  copyFileSync(KIT_ENV_EXAMPLE, envLocal);
  ok('.env.local creado (edítalo con tus credenciales FTP)');
} else {
  warn('.env.local ya existe — no lo sobrescribo. Compara con .env.local.example si necesitas');
}

// 6. Asegurar entradas en .gitignore
const gitignorePath = join(TARGET, '.gitignore');
const entriesToEnsure = ['.env.local', 'Proyecto', 'Proyecto.zip'];
let gitignoreContent = existsSync(gitignorePath)
  ? readFileSync(gitignorePath, 'utf8')
  : '';
const lines = gitignoreContent.split('\n').map((l) => l.trim());
const hasEntry = (entry) =>
  lines.includes(entry) || (entry === '.env.local' && lines.includes('*.local'));
let added = 0;
for (const entry of entriesToEnsure) {
  if (!hasEntry(entry)) {
    gitignoreContent += (gitignoreContent.endsWith('\n') || gitignoreContent === '' ? '' : '\n') + entry + '\n';
    added++;
  }
}
if (added > 0) {
  writeFileSync(gitignorePath, gitignoreContent);
  ok(`.gitignore actualizado (${added} entrada(s))`);
} else {
  ok('.gitignore ya tiene las entradas necesarias');
}

console.log();
ok('Setup completo en ' + TARGET);
console.log();
console.log('Siguientes pasos:');
console.log('  1. Edita \x1b[1m.env.local\x1b[0m con las credenciales FTP del proyecto.');
console.log('  2. Para hacer deploy completo:    \x1b[1mnpm run publish\x1b[0m');
console.log('     Para solo build (sin upload): \x1b[1mnpm run deploy\x1b[0m');
