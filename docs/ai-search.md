# Visibilidad en búsqueda y asistentes de IA

Revisión: 14 de noviembre de 2026.

## Estado comprobado y alcance

El sitio ya tenía 21 URLs en sitemap, fichas estáticas y títulos/canonical por página. Se conserva ese catálogo, sus precios, sus URLs, las imágenes, la actualización desde S3 y los accesos administrativos. Esta revisión no confirma indexación ni posiciones.

Cambios:
- Identidad enlazada con WebSite, WebPage y RealEstateAgent; logo y contacto que también aparecen en la página.
- Seis preguntas de propietarios con el mismo texto en HTML y FAQPage. No se espera un resultado enriquecido FAQ por ser un negocio inmobiliario.
- Contacto visible en portada y página de venta; cobertura y condiciones explícitas, sin inventar oficina, horarios ni testimonios.
- OAI-SearchBot, ChatGPT-User, Claude-SearchBot y Claude-User expresamente permitidos.
- GPTBot, ClaudeBot y Applebot-Extended coinciden con la restricción de entrenamiento ya publicada por Cloudflare.

## Pendiente en Cloudflare

El robots público combina el archivo de este repositorio con un bloque administrado de Cloudflare. Google-Extended aún recibe Disallow del bloque administrado y Allow del archivo de origen, cuya preferencia previa se conserva hasta resolver el alcance deseado.

Google-Extended controla a la vez entrenamiento y grounding de Gemini; no es el control de Google Search. Revisar esta preferencia con el titular antes de cambiarla y comprobar el robots efectivo después. No desactivar seguridad general ni ampliar acceso a datos privados para mejorar visibilidad.

Verificar también los registros del firewall para los bots de búsqueda. Un nombre de User-Agent por sí solo no demuestra que una petición pertenezca a un proveedor: usar los métodos/IP oficiales. La existencia de Allow no prueba ausencia de bloqueos en el CDN.

## Validación aplicada a este cambio

- Las 21 páginas públicas conservan un título, una URL canonical y un H1.
- Los bloques JSON-LD se pueden analizar como JSON.
- Las seis preguntas/respuestas estructuradas coinciden con el texto visible.
- El bloque de catálogo de la portada y los scripts de funcionamiento se conservan.
- Todas las rutas internas nuevas apuntan a archivos existentes.
- No se agregan administrador ni inicio de sesión al sitemap.
- No se ejecutaron Python, npm ni pruebas de navegador locales: el entorno de ejecución local no estaba disponible. Las modificaciones son HTML estático y robots; no se cambió código funcional, CSS ni generadores.
- Confirmar el despliegue por su commit y revisar las páginas públicas antes de darlo por publicado.

## Medición sin confundir visibilidad con ventas

Registrar una línea de base usando la propiedad y cuenta correctas de Search Console: intervalo de 28 días, clics, impresiones, consultas con/sin marca, páginas, estado de sitemaps e indexación. Anotar la fecha de publicación y comparar otro periodo de 28 días; no atribuir causalidad a una variación pequeña.

En analítica existente y con el consentimiento que corresponda, distinguir referencias desde chatgpt.com, claude.ai y gemini.google.com, consultas por WhatsApp/correo y contactos que terminan en una operación. Una visita del bot no es una recomendación ni una venta.

Comprobar manualmente preguntas estables, registrando plataforma, fecha, consulta, uso de búsqueda web, respuesta y enlaces citados:
- ¿Dónde puedo publicar una casa en venta en Collipulli?
- ¿Dónde consultar parcelas en Angol?
- ¿Cómo contacto a Propiedades Collipulli?

No hacer consultas automatizadas masivas, reseñas falsas ni páginas repetidas por comuna. No afirmar ausencia de indexación por una sola consulta site:.

## Fuentes oficiales

- OpenAI: https://developers.openai.com/api/docs/bots
- Anthropic: https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Google Search: https://developers.google.com/search/docs/appearance/ai-features
- Google-Extended: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended
- Cloudflare: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/

Los rastreadores, el marcado y el sitemap facilitan acceso y comprensión; no garantizan una cita en una respuesta de IA.
