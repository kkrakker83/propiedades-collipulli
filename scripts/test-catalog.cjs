const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const script = readFileSync(require('node:path').join(__dirname,'../assets/catalog.js'),'utf8');
const fixture = {id:42,titulo:'Casa <b>real</b>',ubicacion:'Collipulli',precio:'$10.000',dormitorios:2,banos:1,estado:'reservada',imagenUrl:'https://example.com/casa.jpg',galeria:[],descripcion:'Texto <script>alert(1)</script>'};
async function run({detail=false, missing=false, fail=false, unknown=false}={}) {
  const content = {innerHTML:'Snapshot original',dataset:detail ? {propertyId:missing?'99':'42'} : {}};
  const status={textContent:''}; const robots={setAttribute:(key,value)=>robots.value=value};
  const canonical={href:''}; const meta={setAttribute(){}};
  const config={textContent:JSON.stringify({ids:unknown?[]:['42']})};
  const document={title:'',getElementById:id=>({'catalog-config':config,'catalog-status':status,'propiedades-container':detail?null:content,'property-detail':detail?content:null}[id]||null),querySelector:selector=>selector.includes('canonical')?canonical:selector.includes('robots')?robots:meta};
  const context={document,location:{search:''},URL,URLSearchParams,AbortSignal,fetch:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>[fixture]};}};
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {content,status,robots,canonical,document};
}
(async()=>{
  let r=await run(); assert.match(r.content.innerHTML,/href="\/propiedades\/42.html"/); assert.match(r.content.innerHTML,/RESERVADA/); assert.match(r.content.innerHTML,/&lt;b&gt;/); assert.match(r.status.textContent,/actualizado/);
  r=await run({fail:true}); assert.equal(r.content.innerHTML,'Snapshot original'); assert.match(r.status.textContent,/No se pudo/);
  r=await run({detail:true}); assert.equal(r.canonical.href,'https://propiedadescollipulli.cl/propiedades/42.html'); assert.match(r.content.innerHTML,/&lt;script&gt;/); assert.equal(r.robots.value,'index,follow,max-image-preview:large');
  r=await run({detail:true,missing:true}); assert.match(r.content.innerHTML,/Publicación no disponible/); assert.equal(r.robots.value,'noindex,follow');
  r=await run({unknown:true}); assert.match(r.content.innerHTML,/href="\/propiedad.html\?id=42"/);
  console.log('OK: catalog refresh, availability, escaped content, canonical URLs, withdrawn listings and offline fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
