/**
 * Carga de las hojas `@font-face` de las familias del registry.
 *
 * Import por efecto y estático a propósito: el CSS pesa poco y el navegador **no**
 * descarga el `woff2` hasta que un glifo lo necesita, así que declarar las nueve no
 * cuesta ancho de banda. Cargarlas a demanda obligaría a esperar la red antes del
 * primer render de cada preview.
 *
 * Cada import tiene que tener su entrada en `registry.ts` y su paquete en el
 * `package.json` de la app: es lo que hace que la licencia llegue a `/licenses`.
 */

import "@fontsource/bebas-neue";
import "@fontsource/caveat";
import "@fontsource/dancing-script";
import "@fontsource/lobster";
import "@fontsource/pacifico";
import "@fontsource/playfair-display";
import "@fontsource/press-start-2p";
import "@fontsource/space-mono";
