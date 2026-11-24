# Del Rivera · Carnicería & Pollería

Tienda online: los clientes eligen cortes, reservan el retiro y mandan el pedido por WhatsApp.
El local administra productos, stock, precios, fotos, categorías, pagos y horarios desde el panel
(la personita al pie de la página, o la dirección terminada en `#panel`): también el historial de pedidos
con el WhatsApp de cada cliente y el ranking de cortes más vendidos, filtrados por fechas.

## Publicar en Vercel (una sola vez)

1. Importá este repositorio en Vercel (**Add New → Project**). No hace falta cambiar nada de la configuración.
2. En el proyecto: **Storage → Create → Blob** (acceso *público*) y conectalo al proyecto.
   Ahí se guardan las fotos de los productos (`BLOB_READ_WRITE_TOKEN`).
3. Instalá **Upstash for Redis** desde el Marketplace de Vercel (plan Free, región São Paulo) y conectalo al proyecto.
   Ahí se guardan el catálogo y el historial de pedidos (`KV_REST_API_URL` y `KV_REST_API_TOKEN`).
4. **Deployments → Redeploy** para que tome todo.

### Opcional (recomendado)
En **Settings → Environment Variables**:
- `ADMIN_USUARIO` y `ADMIN_CLAVE`: para cambiar el usuario y la contraseña del panel.
  Si no están, se usan los iniciales (`del Rivera` / `carnicería y pollería 123`).
- `SESSION_SECRET`: una frase larga al azar para firmar las sesiones.

## Probar en tu compu
```
npm install
npm run dev
```
Abrí http://localhost:3000. Sin Redis ni Blob configurados, todo se guarda en la carpeta `.datos-local`.

## Estructura
- `public/` – la página (`index.html`), logo, fotos de productos y créditos de las fotos.
- `api/tienda.js` – lee y guarda el catálogo (guardar requiere sesión).
- `api/pedido.js` – registra cada pedido que el cliente manda por WhatsApp (con su número).
- `api/pedidos.js` – historial de pedidos por fechas para el panel (requiere sesión).
- `api/login.js` – verifica usuario y contraseña en el servidor y da una sesión de 12 horas.
- `api/foto.js` – sube fotos de productos a Vercel Blob.
- `api/subir.js` – permiso para que el panel suba videos de la portada directo a Vercel Blob (hasta 40 MB).
- `public/vendor/blob-client.js` – cliente de subida de Vercel Blob empaquetado para el navegador (`@vercel/blob/client`).
