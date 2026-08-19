import fs from 'fs';
import sharp from 'sharp';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const U=env.NEXT_PUBLIC_SUPABASE_URL, K=env.SUPABASE_SERVICE_ROLE_KEY;
const H={apikey:K,Authorization:'Bearer '+K};

// Tamaños y calidad. q88 se ve igual que el original y pesa ~60x menos.
const SIZES=[{w:420,q:88},{w:800,q:88},{w:1200,q:90}];

async function listar(prefix=''){
  const r=await fetch(`${U}/storage/v1/object/list/product-photos`,{method:'POST',
    headers:{...H,'Content-Type':'application/json'},
    body:JSON.stringify({prefix,limit:1000,sortBy:{column:'name',order:'asc'}})});
  return await r.json();
}
async function subir(path,buf){
  const r=await fetch(`${U}/storage/v1/object/product-photos/${path}`,{method:'POST',
    headers:{...H,'Content-Type':'image/webp','x-upsert':'true'},body:buf});
  return r.ok ? true : (console.log('   ! subir',path,r.status,(await r.text()).slice(0,80)), false);
}

// Junta todos los originales (raíz + subcarpetas), ignorando lo ya optimizado
let originales=[];
const raiz=await listar('');
originales.push(...raiz.filter(o=>o.id!==null).map(o=>o.name));
for(const c of raiz.filter(o=>o.id===null).map(o=>o.name)){
  if(c==='opt') continue;
  const f=await listar(c+'/');
  originales.push(...f.filter(o=>o.id!==null).map(o=>c+'/'+o.name));
}
originales=originales.filter(n=>/\.(png|jpe?g)$/i.test(n));

// Qué variantes ya existen (para poder reanudar si se corta)
const yaHechas=new Set();
try{
  const optRaiz=await listar('opt/');
  optRaiz.filter(o=>o.id!==null).forEach(o=>yaHechas.add('opt/'+o.name));
  for(const c of optRaiz.filter(o=>o.id===null).map(o=>o.name)){
    (await listar('opt/'+c+'/')).filter(o=>o.id!==null).forEach(o=>yaHechas.add('opt/'+c+'/'+o.name));
  }
}catch(e){}

console.log(`${originales.length} originales · ${yaHechas.size} variantes ya existentes\n`);
let hechos=0, saltados=0, fallos=0, bytesIn=0, bytesOut=0;
for(const [i,name] of originales.entries()){
  const base=name.replace(/\.(png|jpe?g)$/i,'');
  const faltan=SIZES.filter(s=>!yaHechas.has(`opt/${base}-w${s.w}.webp`));
  if(faltan.length===0){ saltados++; continue; }
  try{
    const res=await fetch(`${U}/storage/v1/object/public/product-photos/${name}`);
    const buf=Buffer.from(await res.arrayBuffer());
    bytesIn+=buf.length;
    for(const s of faltan){
      const out=await sharp(buf).resize({width:s.w,withoutEnlargement:true}).webp({quality:s.q}).toBuffer();
      if(await subir(`opt/${base}-w${s.w}.webp`,out)) bytesOut+=out.length;
    }
    hechos++;
    if(hechos%25===0) console.log(`  ${i+1}/${originales.length} · ${hechos} procesadas`);
  }catch(e){ fallos++; console.log('   x',name,String(e).slice(0,70)); }
}
console.log(`\nprocesadas ${hechos} · ya estaban ${saltados} · fallos ${fallos}`);
console.log(`leidos ${(bytesIn/1048576).toFixed(0)} MB · generados ${(bytesOut/1048576).toFixed(1)} MB`);
