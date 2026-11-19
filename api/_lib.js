// Utilidades compartidas por las funciones de /api
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// ---------- Almacenamiento: Vercel Blob en producción, carpeta local para pruebas ----------
const TOKEN_BLOB = process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), ".datos-local");
const PREFIJO = "tienda/catalogo-";

async function blob(){ return await import("@vercel/blob"); }

export async function leerCatalogo(){
  if(!TOKEN_BLOB){
    try{
      const archivos = (await fs.readdir(LOCAL_DIR)).filter(f => f.startsWith("catalogo-")).sort();
      if(!archivos.length) return {datos:null, version:""};
      const ult = archivos[archivos.length-1];
      return {datos: JSON.parse(await fs.readFile(path.join(LOCAL_DIR, ult), "utf8")), version: ult};
    }catch(e){ return {datos:null, version:""}; }
  }
  const {list} = await blob();
  const {blobs} = await list({prefix: PREFIJO, limit: 1000});
  if(!blobs.length) return {datos:null, version:""};
  blobs.sort((a,b) => a.pathname < b.pathname ? -1 : 1);
  const ult = blobs[blobs.length-1];
  const r = await fetch(ult.url, {cache:"no-store"});
  if(!r.ok) throw new Error("No se pudo leer el catálogo");
  return {datos: await r.json(), version: ult.pathname};
}

export async function guardarCatalogo(datos){
  const nombre = `catalogo-${Date.now().toString().padStart(15,"0")}-${crypto.randomBytes(3).toString("hex")}.json`;
  const json = JSON.stringify(datos);
  if(!TOKEN_BLOB){
    await fs.mkdir(LOCAL_DIR, {recursive:true});
    await fs.writeFile(path.join(LOCAL_DIR, nombre), json);
    return nombre;
  }
  const {put, list, del} = await blob();
  await put("tienda/" + nombre, json, {access:"public", contentType:"application/json", addRandomSuffix:false, cacheControlMaxAge:60});
  // Se guarda cada versión con nombre nuevo (así nunca se lee una copia vieja de la caché) y se borran las más antiguas.
  try{
    const {blobs} = await list({prefix: PREFIJO, limit: 1000});
    blobs.sort((a,b) => a.pathname < b.pathname ? -1 : 1);
    const viejos = blobs.slice(0, Math.max(0, blobs.length - 10)).map(b => b.url);
    if(viejos.length) await del(viejos);
  }catch(e){}
  return "tienda/" + nombre;
}

export async function guardarFoto(buffer, tipo){
  const ext = {"image/webp":"webp","image/jpeg":"jpg","image/png":"png"}[tipo];
  const nombre = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}.${ext}`;
  if(!TOKEN_BLOB){
    await fs.mkdir(path.join(LOCAL_DIR, "fotos"), {recursive:true});
    await fs.writeFile(path.join(LOCAL_DIR, "fotos", nombre), buffer);
    return "/_local/" + nombre;
  }
  const {put} = await blob();
  const r = await put("fotos/" + nombre, buffer, {access:"public", contentType:tipo, addRandomSuffix:false});
  return r.url;
}

// ---------- Sesión del panel ----------
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
const sha = t => crypto.createHash("sha256").update(t).digest("hex");
// Usuario y contraseña iniciales: "del Rivera" / "carnicería y pollería 123".
// Para cambiarlos sin tocar el código, definí ADMIN_USUARIO y ADMIN_CLAVE en Vercel.
const CREDENCIAL = process.env.ADMIN_USUARIO && process.env.ADMIN_CLAVE
  ? sha(norm(process.env.ADMIN_USUARIO) + "|" + norm(process.env.ADMIN_CLAVE))
  : "2619d8a9e6373dd47e62de6f25382fc1484866f98b0b8bc551f6c05eff8ae725";
const SECRETO = process.env.SESSION_SECRET || TOKEN_BLOB || "solo-para-pruebas-locales";
const DURACION = 12 * 60 * 60 * 1000; // 12 horas

export function credencialesValidas(usuario, clave){
  const a = Buffer.from(sha(norm(usuario) + "|" + norm(clave))), b = Buffer.from(CREDENCIAL);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function crearToken(){
  const vence = Date.now() + DURACION;
  const firma = crypto.createHmac("sha256", SECRETO).update("admin." + vence).digest("hex");
  return `${vence}.${firma}`;
}
export function tokenValido(request){
  const m = (request.headers.get("authorization") || "").match(/^Bearer (\d+)\.([a-f0-9]{64})$/);
  if(!m || +m[1] < Date.now()) return false;
  const esperado = Buffer.from(crypto.createHmac("sha256", SECRETO).update("admin." + m[1]).digest("hex"));
  const dado = Buffer.from(m[2]);
  return esperado.length === dado.length && crypto.timingSafeEqual(esperado, dado);
}

// ---------- Validación de lo que manda el panel ----------
const txt = (v, max) => String(v ?? "").slice(0, max);
const esFoto = f => typeof f === "string" && (/^[a-f0-9]{12}$/.test(f)
  || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[\w\-./%]+$/i.test(f) || /^\/_local\/[\w\-.]+$/.test(f));
export function validar(d){
  if(!d || typeof d !== "object" || !Array.isArray(d.productos) || !Array.isArray(d.categorias)) return null;
  const categorias = d.categorias.slice(0, 50).filter(c => c && /^[a-z0-9-]{1,40}$/.test(c.id) && txt(c.nombre, 60).trim())
    .map(c => ({id:c.id, nombre:txt(c.nombre, 60).trim()}));
  if(!categorias.length) return null;
  const ids = new Set(categorias.map(c => c.id));
  const productos = d.productos.slice(0, 500).filter(p => p && /^[\w-]{1,40}$/.test(p.id) && txt(p.nombre, 80).trim()).map(p => ({
    id: p.id, cat: ids.has(p.cat) ? p.cat : categorias[0].id, nombre: txt(p.nombre, 80).trim(), desc: txt(p.desc, 300),
    precio: Math.min(10_000_000, Math.max(0, Math.round(Number(p.precio) || 0))), foto: esFoto(p.foto) ? p.foto : "",
    preps: Array.isArray(p.preps) ? p.preps.slice(0, 12).map(x => txt(x, 60).trim()).filter(Boolean) : [], stock: p.stock !== false }));
  const a = d.ajustes || {};
  const ajustes = {
    whatsapp: txt(a.whatsapp, 20).replace(/\D/g, ""), direccion: txt(a.direccion, 150), horarioTexto: txt(a.horarioTexto, 150),
    dias: Array.isArray(a.dias) ? [...new Set(a.dias.filter(x => Number.isInteger(x) && x >= 0 && x <= 6))] : [1,2,3,4,5,6],
    horarios: Array.isArray(a.horarios) ? a.horarios.slice(0, 30).map(h => txt(h, 10).trim()).filter(Boolean) : [],
    alias: txt(a.alias, 40), cbu: txt(a.cbu, 30), titular: txt(a.titular, 80)
  };
  return {categorias, productos, ajustes};
}

export const json = (obj, status = 200) => new Response(JSON.stringify(obj), {status, headers:{"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"}});
