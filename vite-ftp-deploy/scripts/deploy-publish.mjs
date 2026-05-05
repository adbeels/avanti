import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client as FtpClient } from 'basic-ftp';

const ROOT = process.cwd();
const STAGING = join(ROOT, 'Proyecto');

const log = (msg) => console.log(`\x1b[36m${msg}\x1b[0m`);
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`);

const cfg = {
  host: process.env.DEPLOY_FTP_HOST,
  user: process.env.DEPLOY_FTP_USER,
  password: process.env.DEPLOY_FTP_PASSWORD,
  port: Number(process.env.DEPLOY_FTP_PORT ?? 21),
  secure: process.env.DEPLOY_FTP_SECURE === 'true',
  remoteDir: process.env.DEPLOY_FTP_REMOTE_DIR ?? 'public_html',
  siteUrl: process.env.DEPLOY_SITE_URL,
};

const missing = ['host', 'user', 'password'].filter((k) => !cfg[k]);
if (missing.length) {
  console.error(`✗ Faltan variables en .env.local: ${missing.map((k) => `DEPLOY_FTP_${k.toUpperCase()}`).join(', ')}`);
  process.exit(1);
}

log('▸ A. Generando build + Proyecto/ + Proyecto.zip');
execSync('node scripts/deploy-build.mjs', { stdio: 'inherit' });
if (!existsSync(STAGING)) {
  console.error('✗ La carpeta Proyecto/ no existe. Falló el build.');
  process.exit(1);
}

log(`▸ B. Conectando a ${cfg.host}:${cfg.port} como ${cfg.user}`);
const client = new FtpClient(60_000);
client.ftp.verbose = false;

let totalFiles = 0;
client.trackProgress((info) => {
  if (info.type === 'upload') {
    totalFiles++;
    process.stdout.write(`\r  ↑ ${info.name.padEnd(60)} ${(info.bytesOverall / 1024).toFixed(1)} KB    `);
  }
});

try {
  await client.access({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port,
    secure: cfg.secure,
  });
  ok('Conectado');

  log(`▸ C. Subiendo a ${cfg.remoteDir}`);
  await client.ensureDir(cfg.remoteDir);
  await client.uploadFromDir(STAGING);
  client.trackProgress();
  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  console.log();
  ok(`${totalFiles} archivos subidos a ${cfg.host}:${cfg.remoteDir}`);
  console.log();
  if (cfg.siteUrl) {
    console.log(`Sitio: \x1b[1m${cfg.siteUrl}\x1b[0m`);
  }
  warn('Si tienes Nginx Caching activo en CPanel, púrgalo desde "Nginx Manager"');
  warn('para que los assets nuevos se sirvan de inmediato.');
} catch (err) {
  console.error();
  console.error(`✗ Falló el upload: ${err.message}`);
  process.exit(1);
} finally {
  client.close();
}
