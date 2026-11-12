const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const source = readFileSync(path.join(root,'assets/catalog.js'),'utf8');
const facets = JSON.parse(readFileSync(path.join(root,'catalog-facets.json'),'utf8'));
const titles = JSON.parse(readFileSync(path.join(root,'seo-titles.json'),'utf8'));
const fixture = (id,titulo,ubicacion,extra={}) => ({id,titulo,ubicacion,precio:'Consultar',galeria:[],...extra});
const ids = html => [...new Set([...html.matchAll(/href="\/propiedades\/(\d+)\.html"/g)].map(m=>m[1]))].sort();
async function render(rows, filter, config={}) {
  const container = {innerHTML:'previous',dataset:{filter}};
  const status = {textContent:''};
  const settings = {textContent:JSON.stringify({ids:rows.map(p=>String(p.id)),facets,titles,...config})};
  const document = {getElementById:id=>({'catalog-config':settings,'catalog-status':status,'propiedades-container':container}[id]||null)};
  vm.runInNewContext(source,{document,URL,URLSearchParams,AbortSignal,fetch:async()=>({ok:true,json:async()=>rows})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(status.textContent,/actualizado/);
  return ids(container.innerHTML);
}
(async()=>{
  const rows = [
    fixture(1775526813524,'Amplia propiedad con potencial','Lynch 642'),
    fixture(1778812542090,'Excepcional propiedad de esquina','Collipulli'),
    fixture(101,'Casa en venta','ANGOL'),
    fixture(102,'Parcela en venta con casa','Ángol'),
    fixture(103,'Casa en arriendo','Collipulli'),
    fixture(104,'Casa en venta','Collipulli'),
    fixture(105,'Casa comercial','Collipulli'),
    fixture(1775526438362,'Proyecto en Villa Las Águilas','Curaco')
  ];
  assert.deepEqual(await render(rows,'casas-collipulli'),['104','1775526813524','1778812542090']);
  assert.deepEqual(await render(rows,'parcelas-angol'),['102']);
  assert.deepEqual(await render(rows,'angol'),['101','102']);
  assert.deepEqual(await render([fixture(1775526813524,'Casa en arriendo','Lynch 642')],'casas-collipulli'),[]);
  assert.deepEqual(await render([fixture(1775526813524,'Gran oportunidad','Lynch 642',{comuna:'Angol',tipo:'parcela',operacion:'venta'})],'parcelas-angol'),['1775526813524']);
  assert.deepEqual(await render(rows,'casas-collipulli',{facets:{},titles:{}}),['104']);
  if(process.argv[2]) {
    const actual = JSON.parse(readFileSync(process.argv[2],'utf8'));
    for(const [filename,filter] of [['casas-collipulli.html','casas-collipulli'],['parcelas-angol.html','parcelas-angol'],['propiedades-collipulli.html','collipulli'],['propiedades-angol.html','angol']]) {
      const html = readFileSync(path.join(root,filename),'utf8');
      const block = html.match(/<!-- catalog-start -->([\s\S]*?)<!-- catalog-end -->/)[1];
      const rendered = await render(actual,filter);
      assert.deepEqual(rendered,ids(block),`${filename}: initial HTML and live catalog disagree`);
      console.log(`${filename}: ${rendered.length} matching listings; HTML and JavaScript agree.`);
    }
  }
  console.log('OK: promotional titles, location, accented terms, property type, sale/rent changes and unknown listings.');
})().catch(e=>{console.error(e);process.exitCode=1;});
