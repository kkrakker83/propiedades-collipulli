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
