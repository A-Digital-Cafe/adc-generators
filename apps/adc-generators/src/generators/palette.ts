/**
 * Motor de paletas: generación, contraste WCAG, nombres y extracción desde una
 * imagen. Todo local — la imagen nunca sale del navegador, que es lo que permite
 * que la herramienta funcione sin cuenta y sin declarar un tratamiento nuevo.
 *
 * Los nombres de color se derivan del propio HSL. No se usa ningún sistema con
 * marca (Pantone, RAL, Copic): son bibliotecas licenciadas, no listas de hex.
 */

import type { PaletteColor } from "@common/types/generators/index.ts";

export type HarmonyMode = "analoga" | "complementaria" | "triada" | "monocromatica" | "aleatoria";

export interface Hsl {
	/** 0-360 */
	h: number;
	/** 0-100 */
	s: number;
	/** 0-100 */
	l: number;
}

export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/* ---------- conversiones ---------- */

export function hexToRgb(hex: string): Rgb {
	const clean = hex.replace("#", "");
	const full = clean.length === 3 ? [...clean].map((c) => c + c).join("") : clean;
	const value = Number.parseInt(full, 16);
	return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
	const to = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
	return `#${to(r)}${to(g)}${to(b)}`;
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	const sat = s / 100;
	const lum = l / 100;
	const c = (1 - Math.abs(2 * lum - 1)) * sat;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lum - c / 2;
	const [r, g, b] = (
		[
			[c, x, 0],
			[x, c, 0],
			[0, c, x],
			[0, x, c],
			[x, 0, c],
			[c, 0, x],
		] as const
	)[Math.floor((((h % 360) + 360) % 360) / 60)];
	return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;
	const l = (max + min) / 2;
	if (delta === 0) return { h: 0, s: 0, l: l * 100 };
	const s = delta / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
	else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
	else h = 60 * ((rn - gn) / delta + 4);
	return { h: ((h % 360) + 360) % 360, s: s * 100, l: l * 100 };
}

export const hexToHsl = (hex: string): Hsl => rgbToHsl(hexToRgb(hex));
export const hslToHex = (hsl: Hsl): string => rgbToHex(hslToRgb(hsl));

/* ---------- contraste ---------- */

/** Luminancia relativa WCAG 2.1 (§ definición de contrast ratio). */
export function relativeLuminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	const channel = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razón de contraste entre dos colores, de 1 a 21. */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface ContrastVerdict {
	ratio: number;
	/** Texto normal (< 18pt): AA ≥ 4.5, AAA ≥ 7. */
	normal: "AAA" | "AA" | "falla";
	/** Texto grande (≥ 18pt o 14pt negrita): AA ≥ 3, AAA ≥ 4.5. */
	large: "AAA" | "AA" | "falla";
	/** Componentes de interfaz y gráficos: ≥ 3. */
	ui: boolean;
}

export function contrastVerdict(fg: string, bg: string): ContrastVerdict {
	const ratio = contrastRatio(fg, bg);
	const grade = (aa: number, aaa: number) => (ratio >= aaa ? "AAA" : ratio >= aa ? "AA" : "falla");
	return {
		ratio,
		normal: grade(4.5, 7) as ContrastVerdict["normal"],
		large: grade(3, 4.5) as ContrastVerdict["large"],
		ui: ratio >= 3,
	};
}

/** Color de texto (negro o blanco) que mejor contrasta sobre un fondo. */
export function readableOn(background: string): string {
	return contrastRatio("#000000", background) >= contrastRatio("#ffffff", background) ? "#000000" : "#ffffff";
}

/* ---------- nombres ---------- */

const HUE_NAMES: readonly (readonly [number, string])[] = [
	[15, "rojo"],
	[45, "naranja"],
	[70, "amarillo"],
	[100, "lima"],
	[150, "verde"],
	[195, "turquesa"],
	[215, "celeste"],
	[250, "azul"],
	[285, "violeta"],
	[320, "púrpura"],
	[345, "rosa"],
	[361, "rojo"],
];

/**
 * Nombre descriptivo derivado del HSL. Es intencionalmente aproximado: sirve para
 * distinguir dos muestras en pantalla, no para identificar un color de catálogo.
 */
export function nameColor(hex: string): string {
	const { h, s, l } = hexToHsl(hex);
	if (l >= 96) return "blanco";
	if (l <= 5) return "negro";
	if (s < 10) return l > 60 ? "gris claro" : l > 30 ? "gris" : "gris oscuro";
	const base = HUE_NAMES.find(([limit]) => h < limit)?.[1] ?? "rojo";
	if (l >= 80) return `${base} pálido`;
	if (l <= 25) return `${base} profundo`;
	if (s >= 80) return `${base} intenso`;
	if (s <= 30) return `${base} apagado`;
	return base;
}

/* ---------- generación ---------- */

const OFFSETS: Record<HarmonyMode, readonly number[]> = {
	analoga: [-30, -15, 0, 15, 30],
	complementaria: [0, 15, 180, 195, 165],
	triada: [0, 120, 240, 30, 150],
	monocromatica: [0, 0, 0, 0, 0],
	aleatoria: [],
};

function randomHue(): number {
	return Math.floor(Math.random() * 360);
}

/**
 * Genera una paleta respetando los colores fijados: los `locked` se devuelven tal
 * cual y el resto se recalcula, que es lo que hace útil la barra espaciadora.
 *
 * El tono base sale del primer color fijado si lo hay, para que lo generado
 * acompañe a lo que la persona decidió conservar en vez de ignorarlo.
 */
export function generatePalette(current: readonly PaletteColor[], mode: HarmonyMode, size = 5): PaletteColor[] {
	const anchor = current.find((c) => c.locked);
	const baseHue = anchor ? hexToHsl(anchor.hex).h : randomHue();
	const offsets = OFFSETS[mode];

	return Array.from({ length: size }, (_, i) => {
		const existing = current[i];
		if (existing?.locked) return existing;

		const hsl: Hsl =
			mode === "aleatoria"
				? { h: randomHue(), s: 45 + Math.random() * 45, l: 30 + Math.random() * 45 }
				: mode === "monocromatica"
					? { h: baseHue, s: 35 + Math.random() * 40, l: 18 + i * 16 }
					: { h: (baseHue + (offsets[i] ?? i * 24)) % 360, s: 45 + Math.random() * 40, l: 32 + i * 9 };

		const hex = hslToHex(hsl);
		return { hex, name: nameColor(hex), locked: false };
	});
}

/* ---------- extracción desde imagen ---------- */

/**
 * Colores dominantes de una imagen ya decodificada.
 *
 * Cuantización por celdas de 4 bits por canal: alcanza para "los colores de esta
 * foto" y corre en un frame sobre una miniatura, sin worker ni k-means. Los
 * píxeles casi transparentes se descartan porque tiñen el promedio con el fondo
 * del canvas.
 */
export function extractDominant(pixels: Uint8ClampedArray, count = 5): PaletteColor[] {
	const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.r += r;
			bucket.g += g;
			bucket.b += b;
			bucket.n++;
		} else {
			buckets.set(key, { r, g, b, n: 1 });
		}
	}

	const ordered = [...buckets.values()].sort((a, b) => b.n - a.n);
	const chosen: PaletteColor[] = [];
	for (const bucket of ordered) {
		const hex = rgbToHex({ r: bucket.r / bucket.n, g: bucket.g / bucket.n, b: bucket.b / bucket.n });
		// Descartar lo que ya está representado: sin esto una foto con un cielo grande
		// devuelve cinco azules casi idénticos.
		if (chosen.some((c) => contrastRatio(c.hex, hex) < 1.15)) continue;
		chosen.push({ hex, name: nameColor(hex), locked: false });
		if (chosen.length === count) break;
	}
	return chosen;
}

/* ---------- export a tokens ---------- */

export type TokenFormat = "css" | "tailwind" | "json";

const slug = (name: string, i: number) =>
	(name || `color-${i + 1}`)
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "") || `color-${i + 1}`;

/** Serializa una paleta al formato pedido. Es una feature de plan (`tokenExport`). */
export function serializeTokens(palette: readonly PaletteColor[], format: TokenFormat): string {
	const names = palette.map((c, i) => {
		const base = slug(c.name ?? "", i);
		// Dos "azul apagado" en la misma paleta romperían el CSS en silencio.
		const seen = palette.slice(0, i).filter((p, j) => slug(p.name ?? "", j) === base).length;
		return seen ? `${base}-${seen + 1}` : base;
	});

	if (format === "json") {
		return `${JSON.stringify(Object.fromEntries(names.map((n, i) => [n, palette[i].hex])), null, "\t")}\n`;
	}
	if (format === "tailwind") {
		const entries = names.map((n, i) => `\t\t\t\t${n}: "${palette[i].hex}",`).join("\n");
		return `module.exports = {\n\ttheme: {\n\t\textend: {\n\t\t\tcolors: {\n${entries}\n\t\t\t},\n\t\t},\n\t},\n};\n`;
	}
	return `:root {\n${names.map((n, i) => `\t--color-${n}: ${palette[i].hex};`).join("\n")}\n}\n`;
}
