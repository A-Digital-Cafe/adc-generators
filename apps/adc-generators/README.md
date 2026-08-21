# adc-generators (app)

Generadores y utilidades del subdominio `gen`, devPort 3050. Host React. Consume `GeneratorsService` (entitlements/uso) y la API de `DriveService` para guardar el resultado en la unidad del usuario.

`catalog.ts` (raíz de la app, no `src/`) es la única fuente de verdad de las rutas: lo leen el front, para las pestañas y el router, y `index.ts`, para el sitemap y los meta por ruta. Sumar un estilo o una herramienta es una entrada ahí. **Una URL por generador y por estilo**: una sola ruta con pestañas no se indexa, y el tráfico es el punto.

- **Letras** (`/letras/:estilo`): conversión a puntos de código Unicode decorativos. Todo local, sin cuota, sin servidor. La advertencia de accesibilidad (lectores de pantalla) es parte de la página.
- **Paletas** (`/paletas`, `+/contraste`, `+/desde-imagen`): generación con colores fijables, contraste WCAG AA/AAA y extracción desde una imagen que nunca se sube.
- **Tipografías** (`/tipografias`): render de texto con familias OFL/Apache del registry `src/fonts/`. Export PNG/JPG/WEBP desde canvas; sin sesión sale con marca al pie. El SVG con glifos convertidos a curvas queda para después: pide parsear el archivo de fuente (`opentype.js` sobre el `.woff` que publica `@fontsource`) y es una dependencia y una prueba más, no un `toBlob`.
- **Texto** (`/texto/:herramienta`): mayúsculas, slug, acentos, contador, relleno, reparación de mojibake, ordenar líneas.

Los límites de plan gatean **el output**, nunca la generación. El gate real vive en `GeneratorsService`; lo de la UI es feedback: la opción bloqueada se muestra igual (en gris, con candado) y al tocarla abre el modal de `PlanGate` con el motivo — un aviso al lado de cada control llenaba la página de candados. Ver `CHECKLIST.md` antes de publicar el subdominio.
