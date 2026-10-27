/* Public catalog enhancement. The initial HTML remains readable without JavaScript. */
(() => {
  'use strict';
  const origin = 'https://propiedadescollipulli.cl';
  const source = 'https://propiedades-collipulli-assets.s3.amazonaws.com/data/propiedades.json';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const config = JSON.parse(document.getElementById('catalog-config')?.textContent || '{}');
  const knownIds = config.ids || [];
  const path = id => knownIds.includes(String(id)) ? `/propiedades/${encodeURIComponent(id)}.html` : `/propiedad.html?id=${encodeURIComponent(id)}`;
  const title = p => config.titles?.[String(p.id)] || p.titulo || 'Propiedad';
  const state = p => p.estado || (p.disponible === false ? 'vendida' : 'disponible');
  const photo = p => safeURL(p.imagenUrl) || (p.galeria || []).map(safeURL).find(Boolean) || '';
  const contact = p => `https://wa.me/56989296908?text=${encodeURIComponent(`Hola, quiero consultar por ${title(p)}. ${origin}${path(p.id)}`)}`;
  const card = p => `<article class="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
    ${photo(p) ? `<a href="${path(p.id)}" tabindex="-1" aria-hidden="true"><img src="${esc(photo(p))}" alt="" width="800" height="600" loading="lazy" decoding="async" class="w-full property-photo"></a>` : ''}
    <div class="p-5 flex flex-col flex-grow"><p class="text-sm font-bold text-blue-900 mb-2">${esc(state(p).toUpperCase())}</p>
    <h3 class="text-xl font-bold text-blue-900 mb-2"><a href="${path(p.id)}" class="underline decoration-1 underline-offset-4">${esc(title(p))}</a></h3>
    <p class="text-gray-700 text-sm mb-3">${esc(p.ubicacion)}</p><p class="text-sm mb-3">${esc(p.dormitorios ?? 'Por confirmar')} dormitorios · ${esc(p.banos ?? 'Por confirmar')} baños</p>
    <p class="text-2xl font-black text-blue-900 mt-auto">${esc(p.precio || 'Consultar precio')}</p>
    <div class="flex flex-wrap gap-3 mt-4"><a class="bg-blue-900 text-white px-4 py-2 rounded-lg font-bold" href="${path(p.id)}">Ver ficha</a><a class="bg-green-700 text-white px-4 py-2 rounded-lg font-bold" href="${contact(p)}" target="_blank" rel="noopener noreferrer">Consultar</a></div></div></article>`;
  function matches(p, filter) {
    const text = normalized(`${p.titulo} ${p.ubicacion}`);
    if (filter === 'angol') return text.includes('angol');
    if (filter === 'casas-collipulli') return text.includes('collipulli') && text.includes('casa');
    if (filter === 'collipulli') return text.includes('collipulli');
    return true;
  }
  function updateMeta(p) {
    const canonical = origin + path(p.id);
    const description = `${p.precio || 'Precio a consultar'}. ${p.ubicacion || ''}. ${p.dormitorios ?? ''} dormitorios, ${p.banos ?? ''} baños. Consulta disponibilidad y coordina una visita.`;
    document.title = `${title(p)} | Propiedades Collipulli`;
    for (const [selector, value] of [['meta[name="description"]', description], ['meta[property="og:title"]', document.title], ['meta[property="og:description"]', description], ['meta[property="og:image"]', photo(p)], ['meta[property="og:url"]', canonical]]) {
      document.querySelector(selector)?.setAttribute('content', value);
    }
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.append(canonicalLink); }
    canonicalLink.href = canonical;
  }
  function detail(p) {
    const gallery = [...new Set([photo(p), ...(p.galeria || []).map(safeURL)])].filter(Boolean);
    return `<article class="bg-white rounded-3xl shadow-md p-5 md:p-8"><p class="text-blue-900 font-bold mb-3">${esc(state(p).toUpperCase())}</p>
      <h1 class="text-3xl md:text-4xl font-black text-blue-900 mb-4">${esc(title(p))}</h1><p class="text-gray-700 mb-3">${esc(p.ubicacion)}</p>
      <p class="text-3xl font-bold text-blue-900 mb-3">${esc(p.precio || 'Consultar precio')}</p><p class="mb-6">${esc(p.dormitorios ?? 'Por confirmar')} dormitorios · ${esc(p.banos ?? 'Por confirmar')} baños</p>
      <a class="inline-block bg-green-700 text-white px-5 py-3 rounded-xl font-bold mb-6" href="${contact(p)}" target="_blank" rel="noopener noreferrer">Consultar disponibilidad por WhatsApp</a>
      <div class="grid md:grid-cols-2 gap-4 mb-8">${gallery.slice(0,1).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="${esc(title(p))}" width="1000" height="750" fetchpriority="high" decoding="async" class="w-full property-photo rounded-xl"></a>`).join('')}${gallery.length > 1 ? `<details class="md:col-span-2"><summary class="cursor-pointer font-bold text-blue-900 p-4 bg-gray-100 rounded-xl">Ver todas las fotografías (${gallery.length})</summary><div class="grid md:grid-cols-3 gap-4 mt-4">${gallery.slice(1).map((u,i) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="${esc(title(p))} — fotografía ${i+2}" width="1000" height="750" loading="lazy" decoding="async" class="w-full property-photo rounded-xl"></a>`).join('')}</div></details>` : ''}</div>
      <h2 class="text-2xl font-bold text-blue-900 mb-4">Características de la propiedad</h2><p class="property-description leading-7 text-gray-800">${esc(p.descripcion || 'Consulta los antecedentes de esta propiedad por WhatsApp.')}</p>
      ${(p.videos || []).map(safeURL).filter(Boolean).map(u => `<video controls preload="none" class="w-full rounded-xl mt-6"><source src="${esc(u)}" type="video/mp4">Tu navegador no puede reproducir este video.</video>`).join('')}
      <p class="text-sm text-gray-600 mt-8">Precio, disponibilidad y antecedentes sujetos a confirmación directa antes de coordinar una visita.</p>
      <nav class="flex flex-wrap gap-4 mt-6" aria-label="Compartir propiedad"><a class="underline text-blue-900" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(title(p)+' '+origin+path(p.id))}">Compartir por WhatsApp</a><a class="underline text-blue-900" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(origin+path(p.id))}">Compartir en Facebook</a><a class="underline text-blue-900" href="/#propiedades">Volver al catálogo</a></nav></article>`;
  }
  async function refresh() {
    const status = document.getElementById('catalog-status');
    const container = document.getElementById('propiedades-container');
    const detailContainer = document.getElementById('property-detail');
    try {
      const response = await fetch(source, {signal: AbortSignal.timeout(12000), cache:'no-cache'});
      if (!response.ok) throw new Error('Catálogo no disponible');
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.some(p => !p.id || typeof p.titulo !== 'string')) throw new Error('Catálogo inválido');
      if (container) {
        const filtered = rows.filter(p => matches(p, container.dataset.filter));
        container.innerHTML = filtered.length ? filtered.map(card).join('') : '<p class="col-span-full">No hay publicaciones que coincidan en este momento. Consulta alternativas por WhatsApp.</p>';
      }
      if (detailContainer) {
        const id = detailContainer.dataset.propertyId || new URLSearchParams(location.search).get('id');
        const property = rows.find(p => String(p.id) === String(id));
        if (property) {
          detailContainer.innerHTML = detail(property); updateMeta(property);
          document.querySelector('meta[name="robots"]')?.setAttribute('content','index,follow,max-image-preview:large');
          // The HTML snapshot contains structured data; update mutable facts from the source too.
          const structured = document.getElementById('property-schema');
          if (structured) {
            const graph = JSON.parse(structured.textContent);
            const listing = graph['@graph'].find(item => item['@type'] === 'RealEstateListing');
            if (listing) { listing.name = title(property); listing.description = property.descripcion || ''; delete listing.offers; }
            structured.textContent = JSON.stringify(graph);
          }
        } else {
          detailContainer.innerHTML = '<h1 class="text-3xl font-bold text-blue-900 mb-4">Publicación no disponible</h1><p>Esta publicación ya no figura en el catálogo actual.</p><a class="underline text-blue-900" href="/#propiedades">Ver propiedades actuales</a>';
          document.querySelector('meta[name="robots"]')?.setAttribute('content','noindex,follow');
          document.getElementById('property-schema')?.remove();
        }
      }
      if (status) status.textContent = 'Catálogo actualizado. Confirma precio y disponibilidad antes de coordinar una visita.';
    } catch (error) {
      // Do not erase the readable snapshot when the remote catalog is temporarily unreachable.
      if (status) status.textContent = 'No se pudo comprobar la última actualización. Se muestra la publicación guardada; confirma disponibilidad por WhatsApp.';
    }
  }
  refresh();
})();
