"""Check indexable pages, internal links, structured data and catalog snapshots."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
origin='https://propiedadescollipulli.cl'
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(); self.canon=[]; self.links=[]; self.h1=0; self.title=0; self.description=[]; self.robots=[]; self.json=[]; self.inscript=False; self.buffer=''; self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical': self.canon.append(a.get('href'))
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag=='h1': self.h1+=1
        if tag=='title': self.title+=1
        if tag=='meta' and a.get('name')=='description': self.description.append(a.get('content'))
        if tag=='meta' and a.get('name')=='robots': self.robots.append(a.get('content'))
        if tag=='script' and a.get('type') in ['application/json','application/ld+json']: self.inscript=True; self.buffer=''
    def handle_data(self,data):
        if self.inscript: self.buffer+=data
    def handle_endtag(self,tag):
        if tag=='script' and self.inscript: self.json.append(json.loads(self.buffer)); self.inscript=False

urls=[el.text for el in ET.parse(root/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(urls)==len(set(urls))
links=0
for url in urls:
    relative=urlparse(url).path.lstrip('/') or 'index.html'
    f=root/relative; assert f.exists(),f'Missing {relative}'
    text=f.read_text(encoding='utf-8'); p=Page(text)
    assert p.canon==[url],(relative,p.canon)
    assert p.h1==1,(relative,'h1',p.h1)
    assert p.title==1 and len(p.description)==1 and p.description[0],relative
    assert not any('noindex' in x for x in p.robots),relative
    assert 'cdn.tailwindcss.com' not in text,relative
    for href in p.links:
        u=urlparse(href)
        if u.scheme and not href.startswith(origin+'/'): continue
        if not u.path: continue
        destination=(root/unquote(u.path.lstrip('/'))) if u.path.startswith('/') else f.parent/unquote(u.path)
        if destination.is_dir(): destination=destination/'index.html'
        assert destination.exists(),(relative,href)
        links+=1
for filename in ['admin.html','login.html']:
    assert 'noindex' in (root/filename).read_text(encoding='utf-8')
index=(root/'index.html').read_text(encoding='utf-8')
assert 'Cargando propiedades...' not in index
assert index.count('id="propiedades-container"')==1
assert 'cargarPropiedades()' not in index
assert 'loadProperty()' not in (root/'propiedad.html').read_text(encoding='utf-8')
assert 'Sitemap: '+origin+'/sitemap.xml' in (root/'robots.txt').read_text()
print(f'OK: {len(urls)} indexable URLs, {links} internal links, JSON-LD and metadata valid.')
