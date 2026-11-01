# MASSS CABELLOS — Catálogo

Catálogo web de productos capilares con carrito y pedido por WhatsApp.

- **Sitio:** https://catalogo-massscabellos.vercel.app
- **Panel de administración:** `/admin`

## Stack

- Frontend: Vite + JavaScript vanilla, GSAP (animaciones), hls.js (videos)
- API: Express (`api/index.mjs`) desplegada como función serverless en Vercel
- Datos: Supabase (PostgREST) · Imágenes y videos: Cloudinary

## Desarrollo

```bash
npm install
cp .env.example .env      # completa las variables
npm run admin             # build + servidor local en http://localhost:3000
npm run verify            # pruebas de humo con Playwright
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Acceso a la base de datos |
| `ADMIN_PASSWORD` | Contraseña del panel. Sin ella la API rechaza toda escritura |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET` | Subida de archivos desde el admin |

## Seguridad

Las lecturas (`GET /api/...`) son públicas. Toda escritura (`POST`, `PUT`, `DELETE`)
requiere el header `Authorization: Bearer <ADMIN_PASSWORD>`; el panel `/admin` pide la
contraseña la primera vez que guardas algo y la recuerda durante la sesión del navegador.
