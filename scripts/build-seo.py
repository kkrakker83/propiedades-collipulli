"""Regenerate indexable snapshots from the existing public catalog, without changing S3.
Run: python scripts/build-seo.py && npm run build:css
Review and publish the changed files after updating properties in the existing admin.
"""
import argparse
import html
import json
import re
import urllib.request
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://propiedadescollipulli.cl'
SOURCE = 'https://propiedades-collipulli-assets.s3.amazonaws.com/data/propiedades.json'
esc = lambda value: html.escape(str(value if value is not None else ''), quote=True)
parser = argparse.ArgumentParser()
parser.add_argument('--catalog', type=Path)
args = parser.parse_args()
if args.catalog:
    properties = json.loads(args.catalog.read_text(encoding='utf-8'))
else:
    with urllib.request.urlopen(SOURCE, timeout=30) as response:
        properties = json.load(response)
assert isinstance(properties, list) and properties, 'Empty or invalid catalog; retain previous snapshot.'
assert all(str(p.get('id', '')).isdigit() and p.get('titulo') for p in properties)
assert len({p['id'] for p in properties}) == len(properties), 'Duplicate property ID'
titles = json.loads((ROOT/'seo-titles.json').read_text(encoding='utf-8'))
ids = [str(p['id']) for p in properties]
today = date.today().isoformat()
config = '<script type="application/json" id="catalog-config">'+json.dumps({'ids': ids, 'titles': titles},ensure_ascii=False).replace('<','\\u003c')+'</script><script src="/assets/catalog.js" defer></script>'
def dump(value):
    return json.dumps(value,ensure_ascii=False).replace('<','\\u003c')
def path(p): return '/propiedades/'+str(p['id'])+'.html'
def name(p): return titles.get(str(p['id']), p['titulo'])
def contact(p): return 'https://wa.me/56989296908?text='+quote('Hola, quiero consultar por '+name(p)+'. '+ORIGIN+path(p))
def images(p): return list(dict.fromkeys(u for u in [p.get('imagenUrl'), *p.get('galeria',[])] if u and u.startswith('https://')))
def card(p):
    img = images(p)
    image = f'<a href="{path(p)}" tabindex="-1" aria-hidden="true"><img src="{esc(img[0])}" alt="" width="800" height="600" loading="lazy" decoding="async" class="w-full property-photo"></a>' if img else ''
    return f'''<article class="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">{image}<div class="p-5 flex flex-col flex-grow"><p class="text-sm font-bold text-blue-900 mb-2">{esc(p.get('estado','Consultar').upper())}</p><h3 class="text-xl font-bold text-blue-900 mb-2"><a class="underline decoration-1 underline-offset-4" href="{path(p)}">{esc(name(p))}</a></h3><p class="text-gray-700 text-sm mb-3">{esc(p.get('ubicacion'))}</p><p class="text-sm mb-3">{esc(p.get('dormitorios'))} dormitorios · {esc(p.get('banos'))} baños</p><p class="text-2xl font-black text-blue-900 mt-auto">{esc(p.get('precio','Consultar'))}</p><div class="flex flex-wrap gap-3 mt-4"><a class="bg-blue-900 text-white px-4 py-2 rounded-lg font-bold" href="{path(p)}">Ver ficha</a><a class="bg-green-700 text-white px-4 py-2 rounded-lg font-bold" href="{contact(p)}" target="_blank" rel="noopener noreferrer">Consultar</a></div></div></article>'''
def catalog(rows, filter_name=''):
    return f'<p id="catalog-status" class="catalog-status" role="status">Publicaciones consultadas el {today}. Confirma precio y disponibilidad directamente.</p><div id="propiedades-container" data-filter="{filter_name}" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">'+''.join(card(p) for p in rows)+'</div>'+config

(ROOT/'propiedades').mkdir(exist_ok=True)
for previous in (ROOT/'propiedades').glob('*.html'):
    if previous.stem not in ids:
        previous.write_text('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Publicación no disponible | Propiedades Collipulli</title><link rel="stylesheet" href="/assets/site.css"></head><body class="p-8 bg-gray-100"><h1 class="text-3xl font-bold mb-4">Publicación no disponible</h1><p>Esta publicación ya no figura en el catálogo.</p><a class="underline text-blue-900" href="/#propiedades">Ver propiedades actuales</a></body></html>',encoding='utf-8')
for p in properties:
    url = ORIGIN+path(p)
    description = f"{p.get('precio','Consultar precio')}. {p.get('ubicacion','')}. {p.get('dormitorios','')} dormitorios, {p.get('banos','')} baños. Consulta disponibilidad y coordina una visita."
    listing = {'@type':'RealEstateListing','@id':url+'#publicacion','url':url,'name':name(p),'description':p.get('descripcion',''),'inLanguage':'es-CL','publisher':{'@id':ORIGIN+'/#negocio'},'image':images(p)}
    schema = {'@context':'https://schema.org','@graph':[listing,{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Propiedades Collipulli','item':ORIGIN+'/'},{'@type':'ListItem','position':2,'name':name(p),'item':url}]}]}
    gallery_items=[f'<a href="{esc(u)}" target="_blank" rel="noopener noreferrer"><img src="{esc(u)}" alt="{esc(name(p))} — fotografía {i+1}" width="1000" height="750" {"loading=lazy" if i else "fetchpriority=high"} decoding="async" class="w-full property-photo rounded-xl"></a>' for i,u in enumerate(images(p))]
    gallery=(gallery_items[0] if gallery_items else '') + ('<details class="md:col-span-2"><summary class="cursor-pointer font-bold text-blue-900 p-4 bg-gray-100 rounded-xl">Ver todas las fotografías ('+str(len(gallery_items))+')</summary><div class="grid md:grid-cols-3 gap-4 mt-4">'+''.join(gallery_items[1:])+'</div></details>' if len(gallery_items)>1 else '')
    videos=''.join(f'<video controls preload="none" class="w-full rounded-xl mt-6"><source src="{esc(u)}" type="video/mp4"></video>' for u in p.get('videos',[]) if u.startswith('https://'))
    page=f'''<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(name(p))} | Propiedades Collipulli</title><meta name="description" content="{esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Propiedades Collipulli"><meta property="og:title" content="{esc(name(p))}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{esc(images(p)[0] if images(p) else '')}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/assets/site.css"><script type="application/ld+json" id="property-schema">{dump(schema)}</script></head><body class="bg-gray-100 text-gray-800"><nav class="bg-blue-900 text-white p-4"><div class="max-w-6xl mx-auto flex flex-wrap justify-between gap-4"><a href="/" class="text-xl font-bold">Propiedades Collipulli</a><a class="underline" href="/#propiedades">Volver al catálogo</a></div></nav><main class="max-w-6xl mx-auto p-4 py-8"><nav aria-label="Ruta de navegación" class="mb-4 text-sm"><a href="/" class="underline text-blue-900">Inicio</a> / Ficha de propiedad</nav><p id="catalog-status" class="catalog-status" role="status">Publicación consultada el {today}. Confirma precio y disponibilidad directamente.</p><div id="property-detail" data-property-id="{p['id']}"><article class="bg-white rounded-3xl shadow-md p-5 md:p-8"><p class="text-blue-900 font-bold mb-3">{esc(p.get('estado','Consultar').upper())}</p><h1 class="text-3xl md:text-4xl font-black text-blue-900 mb-4">{esc(name(p))}</h1><p class="text-gray-700 mb-3">{esc(p.get('ubicacion'))}</p><p class="text-3xl font-bold text-blue-900 mb-3">{esc(p.get('precio','Consultar'))}</p><p class="mb-6">{esc(p.get('dormitorios'))} dormitorios · {esc(p.get('banos'))} baños</p><a class="inline-block bg-green-700 text-white px-5 py-3 rounded-xl font-bold mb-6" href="{contact(p)}" target="_blank" rel="noopener noreferrer">Consultar disponibilidad por WhatsApp</a><div class="grid md:grid-cols-2 gap-4 mb-8">{gallery}</div><h2 class="text-2xl font-bold text-blue-900 mb-4">Características de la propiedad</h2><p class="property-description leading-7">{esc(p.get('descripcion',''))}</p>{videos}<p class="text-sm text-gray-600 mt-8">Precio, disponibilidad y antecedentes sujetos a confirmación directa antes de coordinar una visita.</p><nav class="flex flex-wrap gap-4 mt-6" aria-label="Compartir propiedad"><a class="underline text-blue-900" href="https://wa.me/?text={quote(name(p)+' '+url)}" target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a><a class="underline text-blue-900" href="https://www.facebook.com/sharer/sharer.php?u={quote(url)}" target="_blank" rel="noopener noreferrer">Compartir en Facebook</a></nav></article></div><section class="mt-8"><h2 class="text-xl font-bold mb-3">Más propiedades y servicios</h2><div class="flex flex-wrap gap-4"><a href="/casas-collipulli.html" class="underline text-blue-900">Casas en Collipulli</a><a href="/parcelas-angol.html" class="underline text-blue-900">Parcelas en Angol</a><a href="/vender-propiedad-collipulli.html" class="underline text-blue-900">Publicar una propiedad</a></div></section></main><footer class="bg-gray-800 text-gray-300 text-center p-6">Propiedades Collipulli · <a href="tel:+56989296908" class="underline">+56 9 8929 6908</a></footer>{config}</body></html>'''
    (ROOT/path(p).lstrip('/')).write_text(page,encoding='utf-8')

# Replace marker blocks only; repeated builds are deterministic for the same date/data.
index=ROOT/'index.html'
text=index.read_text(encoding='utf-8')
if '<!-- catalog-start -->' in text:
    text=re.sub(r'<!-- catalog-start -->.*?<!-- catalog-end -->','<!-- catalog-start -->'+catalog(properties)+'<!-- catalog-end -->',text,flags=re.S)
else:
    text=re.sub(r'<div id="propiedades-container".*?<\/div>\s*<\/div>', '<!-- catalog-start -->'+catalog(properties)+'<!-- catalog-end -->',text,count=1,flags=re.S)
index.write_text(text,encoding='utf-8')

for filename,filter_name in [('casas-collipulli.html','casas-collipulli'),('parcelas-angol.html','angol'),('propiedades-angol.html','angol'),('propiedades-collipulli.html','collipulli')]:
    rows=[p for p in properties if ('angol' in (p['titulo']+' '+p.get('ubicacion','')).lower() if filter_name=='angol' else 'collipulli' in (p['titulo']+' '+p.get('ubicacion','')).lower() and (filter_name!='casas-collipulli' or 'casa' in p['titulo'].lower()))]
    file=ROOT/filename; text=file.read_text(encoding='utf-8')
    block='<section class="mt-8" aria-label="Publicaciones del catálogo"><h2 class="text-2xl font-bold text-blue-900 mb-4">Publicaciones para consultar</h2>'+catalog(rows,filter_name)+'</section>'
    if '<!-- catalog-start -->' in text: text=re.sub(r'<!-- catalog-start -->.*?<!-- catalog-end -->','<!-- catalog-start -->'+block+'<!-- catalog-end -->',text,flags=re.S)
    else: text=text.replace('</main>','<!-- catalog-start -->'+block+'<!-- catalog-end --></main>')
    file.write_text(text,encoding='utf-8')

# Keep legacy shared links working and consolidate them onto the new indexable URL.
legacy=ROOT/'propiedad.html'; text=legacy.read_text(encoding='utf-8')
text=re.sub(r'<!-- catalog-start -->.*?<!-- catalog-end -->','',text,flags=re.S)
text=text.replace('</body>','<!-- catalog-start -->'+config+'<!-- catalog-end --></body>')
legacy.write_text(text,encoding='utf-8')

pages=[f for f in ROOT.glob('*.html') if f.name not in ['admin.html','login.html','propiedad.html','404.html']]
urls=[ORIGIN+('/' if f.name=='index.html' else '/'+f.name) for f in sorted(pages)] + [ORIGIN+path(p) for p in properties]
old_sitemap=(ROOT/'sitemap.xml').read_text(encoding='utf-8')
# Omit lastmod rather than invent a modification date for unchanged pages.
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('  <url><loc>'+esc(url)+'</loc></url>\n' for url in urls)+'</urlset>\n'
(ROOT/'sitemap.xml').write_text(xml,encoding='utf-8')
print(f'Generated {len(properties)} property pages; sitemap contains {len(urls)} URLs.')
