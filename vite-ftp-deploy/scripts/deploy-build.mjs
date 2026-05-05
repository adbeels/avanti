import { execSync } from 'node:child_process';
import { mkdirSync, cpSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const STAGING = join(ROOT, 'Proyecto');
const ZIP_PATH = join(ROOT, 'Proyecto.zip');

const log = (msg) => console.log(`\x1b[36m${msg}\x1b[0m`);
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);

log('▸ 1/4  Compilando bundle de producción (vite build)...');
execSync('npm run build', { stdio: 'inherit' });
if (!existsSync(DIST)) {
  console.error('✗ La carpeta dist/ no se generó. Revisa errores del build.');
  process.exit(1);
}

log('▸ 2/4  Copiando dist/ → Proyecto/');
if (existsSync(STAGING)) rmSync(STAGING, { recursive: true, force: true });
mkdirSync(STAGING, { recursive: true });
cpSync(DIST, STAGING, { recursive: true });

log('▸ 3/4  Generando .htaccess (rewrite SPA + cache + gzip)');
const htaccess = `# Generado automáticamente por scripts/deploy-build.mjs
# Aplica para Apache (CPanel). Si tu hosting tiene Nginx caching layer,
# Nginx respeta los Cache-Control que se sirven aquí desde Apache.

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Cache largo para assets versionados con hash
<IfModule mod_headers.c>
  <FilesMatch "\\.(js|css|svg|woff2|mjs|png|jpg|jpeg|webp|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "index\\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

# Compresión
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain application/javascript application/json image/svg+xml
</IfModule>

# MIME para .mjs (Vite emite worker como .mjs)
<IfModule mod_mime.c>
  AddType application/javascript .mjs
</IfModule>
`;
writeFileSync(join(STAGING, '.htaccess'), htaccess);

log('▸ 4/4  Empaquetando Proyecto.zip');
if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH, { force: true });

// tar viene built-in en Windows 10+ y maneja dotfiles correctamente. En Windows
// no acepta rutas con ":" (las interpreta como host remoto), así que invocamos
// desde ROOT con rutas relativas.
// -a: auto-detect format por extensión, -c: create, -f: file, -C: chdir antes
execSync('tar -a -cf Proyecto.zip -C Proyecto .', { stdio: 'inherit', cwd: ROOT });

const sizeMB = (statSync(ZIP_PATH).size / 1024 / 1024).toFixed(2);
console.log();
ok(`Listo en ${sizeMB} MB`);
console.log(`  📁 Carpeta:  ${STAGING}`);
console.log(`  📦 ZIP:      ${ZIP_PATH}`);
console.log();
console.log('Siguiente paso: sube Proyecto.zip al servidor, extráelo en la raíz pública,');
console.log('y si tienes Nginx Caching activo en CPanel, púrgalo después de extraer.');
