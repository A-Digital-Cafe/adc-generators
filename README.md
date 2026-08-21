# adc-generators [![Security](https://github.com/A-Digital-Cafe/adc-generators/actions/workflows/security.yml/badge.svg)](https://github.com/A-Digital-Cafe/adc-generators/actions/workflows/security.yml)

Preset de generadores y utilidades del subdominio `gen`: conversor de letras Unicode, paletas de color, texto con tipografías libres y utilidades de texto. Público y sin cuenta; la sesión sólo hace falta para guardar en Drive o exportar en alta calidad.

## Contenido

- `services/GeneratorsService/` — Entitlements por tier (`@common/types/generators`) y medición de uso día/mes en MongoDB. Gatea **el output** (resolución, vector, transparencia, lote, tokens), nunca la generación.
- `apps/adc-generators/` — App React con un **registry de generadores**: sumar uno es un archivo y una entrada. Una URL por generador y por estilo (de ahí sale el SEO). Guardado del resultado en el Drive del usuario reusando la API de `adc-drive`.

## Reglas propias

- **Tipografías**: sólo OFL/Apache y **siempre como dependencia npm** (`@fontsource/*`), porque `scripts/build-license-notices.mjs` recorre el árbol de dependencias de cada app y publica su licencia en `/licenses`. Un `.ttf` suelto en `public/` rompe esa atribución. Sin botón de descarga del archivo de fuente.
- **Sin sistemas de color con marca** (Pantone, RAL, Copic) ni paletas de marcas de terceros: son bibliotecas licenciadas, no listas de hex.
- **Sin publicidad y sin conteo anónimo server-side**: el gate de export exige sesión, así que no hace falta identificar por IP a quien no la tiene.

Ver `apps/adc-generators/CHECKLIST.md` antes de publicar el subdominio.

## Uso

```json
{ "services": [{ "name": "GeneratorsService", "version": "latest" }] }
```

El preset es opcional: si la carpeta está presente, el servicio y la app se cargan; si no, la plataforma funciona igual. El guardado en Drive requiere el preset `adc-drive`; sin él, la app sólo descarga localmente.
