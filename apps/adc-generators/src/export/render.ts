/**
 * Render de texto a canvas. Es el único generador de la app que produce un archivo
 * y por lo tanto el único que consume cuota.
 *
 * El tamaño de salida se fija por el **lado más largo**, que es lo que gatea el
 * plan: se maqueta a un tamaño base cómodo y después se escala el contexto entero,
 * así el resultado es el mismo dibujo a más resolución y no una tipografía distinta.
 */

import { findFont, fontStack } from "../fonts/registry.ts";
import type { ExportFormat } from "@common/types/generators/index.ts";

/** Tamaño de tipografía con el que se maqueta antes de escalar. */
const BASE_FONT_SIZE = 96;

export interface TextRenderOptions {
	text: string;
	fontId: string;
	color: string;
	background: string;
	transparent: boolean;
	align: CanvasTextAlign;
	/** Múltiplo del tamaño de fuente. */
	lineHeight: number;
	/** Margen alrededor del texto, como múltiplo del tamaño de fuente. */
	padding: number;
	/** Lado más largo del archivo resultante, en px. */
	longEdge: number;
	/**
	 * Marca discreta al pie. Se usa **sólo en el export anónimo**, que es el único que
	 * no pasa por el gate del servidor: sin ella, no iniciar sesión sería la forma
	 * gratuita de saltarse la cuota.
	 */
	watermark?: string;
}

export const DEFAULT_RENDER: Omit<TextRenderOptions, "text" | "longEdge"> = {
	fontId: "bebas-neue",
	color: "#2b1608",
	background: "#fff4ec",
	transparent: false,
	align: "center",
	lineHeight: 1.2,
	padding: 0.35,
};

/**
 * Espera a que la familia esté disponible antes de medir.
 *
 * Sin esto el primer render sale con la fuente de fallback: `measureText` no
 * bloquea, así que mide el sustituto y el archivo queda mal aunque en pantalla
 * después se vea bien.
 */
export async function ensureFontReady(fontId: string): Promise<void> {
	const font = findFont(fontId);
	if (!font?.pkg || !globalThis.document?.fonts) return;
	try {
		await document.fonts.load(`${BASE_FONT_SIZE}px "${font.family}"`);
	} catch {
		/* la familia no cargó: se dibuja con el fallback del stack, que es lo que se ve en pantalla */
	}
}

interface Layout {
	lines: string[];
	width: number;
	height: number;
	pad: number;
	lineHeightPx: number;
}

function layout(ctx: CanvasRenderingContext2D, options: TextRenderOptions): Layout {
	ctx.font = `${BASE_FONT_SIZE}px ${fontStack(options.fontId)}`;
	const lines = options.text.split(/\r\n|\r|\n/);
	const widest = Math.max(1, ...lines.map((l) => ctx.measureText(l).width));
	const pad = BASE_FONT_SIZE * options.padding;
	const lineHeightPx = BASE_FONT_SIZE * options.lineHeight;
	return {
		lines,
		width: widest + pad * 2,
		height: lineHeightPx * lines.length + pad * 2,
		pad,
		lineHeightPx,
	};
}

/** Dibuja el texto y devuelve el canvas ya al tamaño final. */
export async function renderText(options: TextRenderOptions): Promise<HTMLCanvasElement> {
	await ensureFontReady(options.fontId);

	const scratch = document.createElement("canvas").getContext("2d");
	if (!scratch) throw new Error("CANVAS_UNAVAILABLE");
	const box = layout(scratch, options);

	const scale = options.longEdge / Math.max(box.width, box.height);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(box.width * scale));
	canvas.height = Math.max(1, Math.round(box.height * scale));

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
	ctx.scale(scale, scale);

	if (!options.transparent) {
		ctx.fillStyle = options.background;
		ctx.fillRect(0, 0, box.width, box.height);
	}

	ctx.font = `${BASE_FONT_SIZE}px ${fontStack(options.fontId)}`;
	ctx.fillStyle = options.color;
	ctx.textAlign = options.align;
	ctx.textBaseline = "middle";

	const x = options.align === "left" ? box.pad : options.align === "right" ? box.width - box.pad : box.width / 2;
	box.lines.forEach((line, i) => {
		ctx.fillText(line, x, box.pad + box.lineHeightPx * (i + 0.5));
	});

	if (options.watermark) drawWatermark(ctx, box, options);

	return canvas;
}

/** Marca al pie, en el color del texto y muy tenue: identifica sin arruinar el resultado. */
function drawWatermark(ctx: CanvasRenderingContext2D, box: Layout, options: TextRenderOptions): void {
	const size = Math.max(10, BASE_FONT_SIZE * 0.14);
	ctx.save();
	ctx.globalAlpha = 0.45;
	ctx.font = `${size}px system-ui, sans-serif`;
	ctx.fillStyle = options.color;
	ctx.textAlign = "right";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(options.watermark!, box.width - size * 0.6, box.height - size * 0.6);
	ctx.restore();
}

const MIME: Record<ExportFormat, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	webp: "image/webp",
};

/** `true` si el formato conserva canal alfa. JPG no, y la UI tiene que saberlo. */
export function supportsTransparency(format: ExportFormat): boolean {
	return format !== "jpg";
}

export function mimeOf(format: ExportFormat): string {
	return MIME[format];
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality = 0.92): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("ENCODE_FAILED"))), MIME[format], quality);
	});
}
