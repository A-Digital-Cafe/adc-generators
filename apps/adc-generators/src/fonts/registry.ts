/**
 * Registry de tipografías. Sumar una familia = una entrada acá + su import en
 * `load.ts`.
 *
 * **Regla que no se negocia**: la familia entra como dependencia npm
 * (`@fontsource/*`) declarada en el `package.json` de esta app. `scripts/build-license-notices.mjs`
 * recorre ese árbol y publica la licencia en `/licenses`; un `.ttf` copiado a
 * `public/` no aparece en ningún lado y deja la atribución rota sin avisar.
 *
 * Sólo licencias que permiten uso comercial del render sin condiciones (SIL OFL,
 * Apache-2.0), porque los Términos § 6 prometen que el resultado es del usuario y
 * que puede usarlo comercialmente.
 */

import type { FontLibraryTier } from "@common/types/generators/index.ts";

export interface FontDefinition {
	/** Lo que se persiste (estable: no renombrar, rompe los kits guardados). */
	id: string;
	label: string;
	/** Stack CSS completo — va tal cual a `ctx.font` y al preview. */
	stack: string;
	/** Nombre de familia para `document.fonts.load()`. */
	family: string;
	/** Catálogo mínimo que la incluye. */
	tier: FontLibraryTier;
	/** Paquete que la provee; `null` = familia genérica del sistema, nada que atribuir. */
	pkg: string | null;
	license: "OFL-1.1" | "Apache-2.0" | null;
	/** Pista para la UI: agrupa el selector. */
	category: "display" | "manuscrita" | "serif" | "sans" | "mono";
}

const registry = new Map<string, FontDefinition>();

export function registerFont(def: FontDefinition): void {
	registry.set(def.id, def);
}

/** Catálogo completo, sin filtrar por plan. */
export function allFonts(): FontDefinition[] {
	return [...registry.values()];
}

/**
 * Catálogo visible para un tier. El filtro es de **presentación**: el catálogo
 * entero viaja en el bundle igual, así que esto no es un control de acceso —
 * ocultar la lista sería teatro. Lo que se gatea de verdad es el export.
 */
export function fontsFor(tier: FontLibraryTier): FontDefinition[] {
	return allFonts().filter((f) => tier === "full" || f.tier === "basic");
}

export function findFont(id: string): FontDefinition | undefined {
	return registry.get(id);
}

/** Stack CSS de una familia; fallback razonable si el id no existe. */
export function fontStack(id: string): string {
	return registry.get(id)?.stack ?? "system-ui, sans-serif";
}

// Familia del sistema: siempre disponible, nada que descargar ni que atribuir.
registerFont({
	id: "system-sans",
	label: "Sistema",
	stack: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
	family: "system-ui",
	tier: "basic",
	pkg: null,
	license: null,
	category: "sans",
});

registerFont({
	id: "bebas-neue",
	label: "Bebas Neue",
	stack: '"Bebas Neue", Impact, sans-serif',
	family: "Bebas Neue",
	tier: "basic",
	pkg: "@fontsource/bebas-neue",
	license: "OFL-1.1",
	category: "display",
});

registerFont({
	id: "caveat",
	label: "Caveat",
	stack: 'Caveat, "Segoe Script", cursive',
	family: "Caveat",
	tier: "basic",
	pkg: "@fontsource/caveat",
	license: "OFL-1.1",
	category: "manuscrita",
});

registerFont({
	id: "space-mono",
	label: "Space Mono",
	stack: '"Space Mono", ui-monospace, monospace',
	family: "Space Mono",
	tier: "basic",
	pkg: "@fontsource/space-mono",
	license: "OFL-1.1",
	category: "mono",
});

registerFont({
	id: "dancing-script",
	label: "Dancing Script",
	stack: '"Dancing Script", cursive',
	family: "Dancing Script",
	tier: "full",
	pkg: "@fontsource/dancing-script",
	license: "OFL-1.1",
	category: "manuscrita",
});

registerFont({
	id: "lobster",
	label: "Lobster",
	stack: "Lobster, cursive",
	family: "Lobster",
	tier: "full",
	pkg: "@fontsource/lobster",
	license: "OFL-1.1",
	category: "display",
});

registerFont({
	id: "pacifico",
	label: "Pacifico",
	stack: "Pacifico, cursive",
	family: "Pacifico",
	tier: "full",
	pkg: "@fontsource/pacifico",
	license: "OFL-1.1",
	category: "manuscrita",
});

registerFont({
	id: "playfair-display",
	label: "Playfair Display",
	stack: '"Playfair Display", Georgia, serif',
	family: "Playfair Display",
	tier: "full",
	pkg: "@fontsource/playfair-display",
	license: "OFL-1.1",
	category: "serif",
});

registerFont({
	id: "press-start-2p",
	label: "Press Start 2P",
	stack: '"Press Start 2P", ui-monospace, monospace',
	family: "Press Start 2P",
	tier: "full",
	pkg: "@fontsource/press-start-2p",
	license: "OFL-1.1",
	category: "display",
});
