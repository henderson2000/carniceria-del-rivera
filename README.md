# Del Rivera · Carnicería & Pollería

Tienda online: los clientes eligen cortes, reservan el retiro y mandan el pedido por WhatsApp.
El local administra productos, stock, precios, fotos, categorías, pagos y horarios desde el panel
(la personita al pie de la página, o la dirección terminada en `#panel`).

## Publicar en Vercel (una sola vez)

1. Importá este repositorio en Vercel (**Add New → Project**). No hace falta cambiar nada de la configuración.
2. En el proyecto: **Storage → Create → Blob** (acceso *público*) y conectalo al proyecto.
   Esto crea la variable `BLOB_READ_WRITE_TOKEN`, que es donde se guardan los datos y las fotos.
3. **Deployments → Redeploy** para que tome el almacenamiento.

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
Abrí http://localhost:3000. Sin Blob configurado, los datos se guardan en la carpeta `.datos-local`.

## Estructura
- `public/` – la página (`index.html`), logo, fotos de productos y créditos de las fotos.
- `api/tienda.js` – lee y guarda el catálogo (guardar requiere sesión).
- `api/login.js` – verifica usuario y contraseña en el servidor y da una sesión de 12 horas.
- `api/foto.js` – sube fotos de productos a Vercel Blob.
