import {leerCatalogo, guardarCatalogo, tokenValido, validar, json} from "./_lib.js";

// GET /api/tienda → catálogo actual (lo usan todos los visitantes)
export async function GET(){
  try{ return json(await leerCatalogo()); }
  catch(e){ console.error(e); return json({error:"No se pudo leer el catálogo"}, 500); }
}

// PUT /api/tienda → guarda cambios del panel (requiere sesión)
export async function PUT(request){
  if(!tokenValido(request)) return json({error:"Tu sesión venció: ingresá de nuevo"}, 401);
  let cuerpo;
  try{ cuerpo = await request.json(); }catch(e){ return json({error:"Datos inválidos"}, 400); }
  if(JSON.stringify(cuerpo).length > 400_000) return json({error:"Demasiados datos"}, 413);
  const datos = validar(cuerpo);
  if(!datos) return json({error:"Revisá los datos: falta alguna categoría o producto"}, 400);
  try{ const version = await guardarCatalogo(datos); return json({ok:true, version, datos}); }
  catch(e){ console.error(e); return json({error:"No se pudo guardar. ¿Está conectado el almacenamiento Blob en Vercel?"}, 500); }
}
