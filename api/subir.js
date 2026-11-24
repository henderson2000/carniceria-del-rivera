import {hayBlob, tokenValido, tokenTextoValido, guardarFoto, json} from "./_lib.js";

const VIDEOS = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGENES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 40;

// GET /api/subir → cómo subir archivos grandes (directo a Vercel Blob, o al servidor en pruebas locales)
export async function GET(){ return json({modo: hayBlob ? "blob" : "local", maxMB: MAX_MB}); }

// POST /api/subir
//  - En Vercel: entrega un permiso de subida para que el navegador mande el video directo a Blob
//    (los videos superan el tamaño que acepta una función).
//  - En la compu: recibe el archivo y lo guarda en .datos-local.
export async function POST(request){
  if(!hayBlob){
    if(!tokenValido(request)) return json({error:"Tu sesión venció: ingresá de nuevo"}, 401);
    const tipo = (request.headers.get("content-type") || "").split(";")[0].trim();
    if(![...VIDEOS, ...IMAGENES].includes(tipo)) return json({error:"Formato no permitido"}, 415);
    const buf = Buffer.from(await request.arrayBuffer());
    if(!buf.length || buf.length > MAX_MB * 1024 * 1024) return json({error:`El archivo tiene que pesar menos de ${MAX_MB} MB`}, 413);
    return json({url: await guardarFoto(buf, tipo)});
  }
  const {handleUpload} = await import("@vercel/blob/client");
  let body;
  try{ body = await request.json(); }catch(e){ return json({error:"Pedido inválido"}, 400); }
  try{
    const r = await handleUpload({body, request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if(!tokenTextoValido(clientPayload)) throw new Error("Tu sesión venció: ingresá de nuevo");
        if(!/^portada\/[\w\-.]+$/.test(pathname)) throw new Error("Nombre de archivo inválido");
        return {allowedContentTypes:[...VIDEOS, ...IMAGENES], maximumSizeInBytes: MAX_MB * 1024 * 1024, addRandomSuffix: true};
      }});
    return json(r);
  }catch(e){ return json({error: e.message || "No se pudo subir"}, 400); }
}
