# Catálogo indexable de Propiedades Collipulli

Las publicaciones públicas de S3 siguen siendo la fuente de los datos. El administrador existente y los enlaces compartidos `propiedad.html?id=…` siguen funcionando.

Las fichas en `propiedades/` y los listados iniciales son HTML legible sin ejecutar JavaScript. Al abrirlos, `assets/catalog.js` consulta el catálogo público para actualizar datos y avisar si la publicación fue retirada. Si S3 falla, conserva la copia con su fecha y pide confirmar disponibilidad. No se copian credenciales ni datos del administrador.

## Después de agregar, modificar o retirar publicaciones

Regenerar y publicar las copias HTML para que también cambien los metadatos, las fichas nuevas y el mapa del sitio:

```sh
python scripts/build-seo.py
npm ci
npm run build:css
python scripts/check-seo.py
```

Revisar los cambios y publicarlos por el mecanismo existente de GitHub Pages. No hay una sincronización programada ni una automatización que escriba en S3. Las fichas nuevas seguirán siendo accesibles mediante la dirección anterior hasta regenerar. `seo-titles.json` contiene títulos editoriales basados en los anuncios actuales; revisarlos si cambia el inmueble al que corresponde un identificador.

El sitemap contiene solo direcciones canónicas. No inventa fechas de última modificación. Si se retira una publicación, la siguiente generación retira su URL del sitemap y convierte su ficha antigua en un aviso no indexable que enlaza al catálogo.

Las puntuaciones técnicas, los datos estructurados y el envío de un sitemap no garantizan indexación ni posiciones. Medir consultas y páginas en Search Console.

## Clasificación de las publicaciones

`catalog-facets.json` guarda comuna, tipo y operación revisados con las fichas públicas. Evita perder casas cuyo título es promocional y separar casas de parcelas en las páginas de venta. Los campos estructurados `comuna`, `tipo` y `operacion` del catálogo remoto tienen prioridad; un título que anuncie arriendo excluye la propiedad de venta. Para anuncios nuevos sin esos campos, se reconocen términos explícitos del título/ubicación. Si no hay evidencia suficiente, se mantiene el anuncio en el catálogo general y se revisa su clasificación antes de incluirlo en una categoría.

Al cambiar un inmueble o su operación, revisar también esta clasificación y `seo-titles.json`. La publicación de Villa Las Águilas indica Curaco, sin comuna explícita: no se asigna a Collipulli por suposición. La información de estas reglas es pública y se incorpora al HTML; nunca agregar datos privados.

Comprobar además los filtros:

```sh
node scripts/test-catalog.cjs
node scripts/test-catalog-filters.cjs
```

Las páginas de casas en Collipulli y parcelas en Angol mantienen sus URLs y títulos principales. Sus catálogos aparecen cerca del inicio, seguidos de información específica y preguntas de compradores. El SEO no cambia precios, condiciones comerciales ni disponibilidad en S3.
