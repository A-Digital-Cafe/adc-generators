import type { ReactNode } from "react";
import type { GeneratorId } from "../../catalog.ts";
import { LettersPanel } from "./panels/LettersPanel.tsx";
import { PalettePanel } from "./panels/PalettePanel.tsx";
import { TextPanel } from "./panels/TextPanel.tsx";
import { TypographyPanel } from "./panels/TypographyPanel.tsx";

/**
 * Mapa grupo → panel. Es la otra mitad del registry: `catalog.ts` dice qué rutas
 * existen (y lo lee también el kernel para el sitemap), esto dice qué se dibuja.
 *
 * Sumar un generador = una entrada en el catálogo, un panel y una línea acá.
 */
const PANELS: Record<GeneratorId, (slug?: string) => ReactNode> = {
	letras: (slug) => <LettersPanel styleSlug={slug} />,
	paletas: (slug) => <PalettePanel toolSlug={slug} />,
	tipografias: () => <TypographyPanel />,
	texto: (slug) => <TextPanel toolSlug={slug} />,
};

export function renderGenerator(group: GeneratorId, slug?: string): ReactNode {
	return PANELS[group](slug);
}
