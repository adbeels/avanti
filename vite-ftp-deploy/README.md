# vite-ftp-deploy

Kit reutilizable para desplegar proyectos **Vite** a un servidor por **FTP** con un solo comando.

## Qué hace

- `npm run deploy` — compila el proyecto, copia `dist/` a `Proyecto/`, agrega un `.htaccess` con rewrite SPA + cache + compresión, y empaca todo en `Proyecto.zip`.
- `npm run publish` — todo lo anterior **+ sube los archivos por FTP** al servidor configurado en `.env.local`.

## Requisitos

- **Node.js 20.6+** (necesario para `--env-file` con `.env.local`)
- **Windows 10+ / macOS / Linux** (usan `tar` built-in para crear el ZIP)
- Tu proyecto debe ser **Vite** (probado con Vite 5, debería servir cualquier versión)

## Cómo instalarlo en un proyecto nuevo

Desde la raíz de tu proyecto Vite, ejecuta el `install.mjs` apuntando a donde tengas el kit. El script detecta su propia ubicación (vía `import.meta.url`) y copia los archivos relativos a ahí, así que **funciona desde cualquier ruta**: la carpeta del kit puede estar en `Documents/`, junto al proyecto, en otro disco, etc.

```bash
# Reemplaza <ruta-al-kit> con la ubicación real de la carpeta vite-ftp-deploy
node "<ruta-al-kit>/install.mjs"
```

Ejemplos:

```bash
# Si el kit está en Documents:
node "C:/Users/tu-usuario/Documents/vite-ftp-deploy/install.mjs"

# Si lo dejaste junto al proyecto:
node "./vite-ftp-deploy/install.mjs"

# Linux / macOS:
node ~/tools/vite-ftp-deploy/install.mjs
```

El script:

1. Copia `scripts/deploy-build.mjs` y `scripts/deploy-publish.mjs` a tu proyecto.
2. Agrega los scripts `deploy` y `publish` a tu `package.json`.
3. Instala `basic-ftp` (cliente FTP).
4. Crea `.env.local` con un template de credenciales FTP.
5. Actualiza `.gitignore` para que `.env.local`, `Proyecto/` y `Proyecto.zip` no se comiteen.

Después, edita `.env.local` con las credenciales del proyecto:

```bash
DEPLOY_FTP_HOST=ftp.tudominio.com
DEPLOY_FTP_PORT=21
DEPLOY_FTP_USER=usuario@tudominio.com
DEPLOY_FTP_PASSWORD="tu-password"
DEPLOY_FTP_SECURE=false
DEPLOY_FTP_REMOTE_DIR=public_html/subdominio
DEPLOY_SITE_URL=https://subdominio.tudominio.com
```

> **Importante**: si la password tiene `#`, `?`, espacios u otros caracteres especiales, **enciérrala en comillas dobles** (`"..."`). Si no, el parser de `.env` puede truncarla.

Y luego:

```bash
npm run publish
```

## Variables de `.env.local`

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `DEPLOY_FTP_HOST` | sí | — | Servidor FTP, ej. `ftp.tudominio.com` |
| `DEPLOY_FTP_USER` | sí | — | Usuario FTP |
| `DEPLOY_FTP_PASSWORD` | sí | — | Password FTP (entre comillas si tiene caracteres especiales) |
| `DEPLOY_FTP_PORT` | no | `21` | Puerto FTP |
| `DEPLOY_FTP_SECURE` | no | `false` | `true` para FTPS (FTP sobre TLS) |
| `DEPLOY_FTP_REMOTE_DIR` | no | `public_html` | Directorio destino en el servidor |
| `DEPLOY_SITE_URL` | no | — | URL pública para mostrar al final del deploy |

## Para editar el kit

Si en algún proyecto necesitas algo distinto (otro hosting, otro `.htaccess`, etc.), edita los archivos directamente dentro del proyecto. Si quieres que el cambio aplique a **futuros** proyectos, edita los archivos del kit en su carpeta original (donde sea que la tengas):

```
vite-ftp-deploy/
├── install.mjs                    ← bootstrap
├── scripts/
│   ├── deploy-build.mjs           ← build + zip + .htaccess
│   └── deploy-publish.mjs         ← upload por FTP
├── .env.local.example             ← template de credenciales
└── README.md
```

## Notas de seguridad

- `.env.local` **nunca** debe subirse a git. El kit lo agrega a `.gitignore` automáticamente.
- FTP sin SSL envía las credenciales en texto plano. Si tu hosting soporta FTPS (`SSL=1`), usa `DEPLOY_FTP_SECURE=true`. Para mejor seguridad, considera SFTP (puerto 22), pero `basic-ftp` no lo soporta — necesitarías `ssh2-sftp-client` y modificar el script.

## Troubleshooting

**`530 Login authentication failed`** — Probablemente la password tiene `#` u otro carácter especial sin comillas. Enciérrala en `"..."` en `.env.local`.

**`tar: Cannot connect to C: resolve failed`** — Estás en Windows y `tar` está interpretando la ruta como host remoto. El script usa rutas relativas para evitar esto, así que si te aparece, abre un issue/dime y lo veo.

**Los assets nuevos no se sirven después del deploy** — Si tu hosting tiene Nginx caching (CPanel → Nginx Manager), pulsa **Purge Cache** después de cada deploy.
