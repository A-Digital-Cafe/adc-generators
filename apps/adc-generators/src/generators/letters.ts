/**
 * Conversor de letras: mapea cada carácter a otro **punto de código Unicode**, no
 * a otra tipografía. Por eso el resultado sobrevive a un copiar/pegar en una bio de
 * Instagram, donde no hay formato — y por eso los lectores de pantalla lo leen mal.
 *
 * Casi todos los estilos salen de bloques contiguos (Mathematical Alphanumeric
 * Symbols, Enclosed Alphanumerics, Fullwidth). Los bloques matemáticos tienen
 * **agujeros**: algunas letras se estandarizaron antes, en Letterlike Symbols, y
 * su celda quedó reservada. Sin los overrides de `holes` esas letras salen como
 * caracteres no asignados y el texto se ve roto en la mitad de los dispositivos.
 */

/** Rango contiguo a partir de un punto de código, con excepciones por letra. */
interface Range {
	from: string;
	start: number;
	holes?: Record<string, string>;
}

function expand(ranges: readonly Range[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const range of ranges) {
		const base = range.from.codePointAt(0)!;
		const length = range.from === "0" ? 10 : 26;
		for (let i = 0; i < length; i++) {
			const source = String.fromCodePoint(base + i);
			map.set(source, range.holes?.[source] ?? String.fromCodePoint(range.start + i));
		}
	}
	return map;
}

/** Tabla explícita `"ab" -> "xy"`, para los estilos que no siguen ningún bloque. */
function table(source: string, target: readonly string[]): Map<string, string> {
	const chars = [...source];
	return new Map(chars.map((c, i) => [c, target[i]]));
}

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";

const SCRIPT_HOLES: Record<string, string> = {
	B: "ℬ",
	E: "ℰ",
	F: "ℱ",
	H: "ℋ",
	I: "ℐ",
	L: "ℒ",
	M: "ℳ",
	R: "ℛ",
	e: "ℯ",
	g: "ℊ",
	o: "ℴ",
};

const FRAKTUR_HOLES: Record<string, string> = {
	C: "ℭ",
	H: "ℌ",
	I: "ℑ",
	R: "ℜ",
	Z: "ℨ",
};

const DOUBLE_HOLES: Record<string, string> = {
	C: "ℂ",
	H: "ℍ",
	N: "ℕ",
	P: "ℙ",
	Q: "ℚ",
	R: "ℝ",
	Z: "ℤ",
};

const SMALL_CAPS = [
	"ᴀ", "ʙ", "ᴄ", "ᴅ", "ᴇ", "ꜰ", "ɢ", "ʜ", "ɪ", "ᴊ",
	"ᴋ", "ʟ", "ᴍ", "ɴ", "ᴏ", "ᴘ", "ǫ", "ʀ", "ꜱ", "ᴛ",
	"ᴜ", "ᴠ", "ᴡ", "x", "ʏ", "ᴢ",
];

const UPSIDE_DOWN_LOWER = [
	"ɐ", "q", "ɔ", "p", "ǝ", "ɟ", "ƃ", "ɥ", "ᴉ", "ɾ",
	"ʞ", "l", "ɯ", "u", "o", "d", "b", "ɹ", "s", "ʇ",
	"n", "ʌ", "ʍ", "x", "ʎ", "z",
];

const UPSIDE_DOWN_UPPER = [
	"∀", "𐐒", "Ɔ", "ᗡ", "Ǝ", "Ⅎ", "⅁", "H", "I", "ſ",
	"ʞ", "˥", "W", "N", "O", "Ԁ", "Ò", "ᴚ", "S", "⊥",
	"∩", "Λ", "M", "X", "⅄", "Z",
];

const UPSIDE_DOWN_EXTRA: Record<string, string> = {
	"0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ",
	"6": "9", "7": "ㄥ", "8": "8", "9": "6",
	".": "˙", ",": "'", "'": ",", '"': "„", "?": "¿", "!": "¡",
	"[": "]", "]": "[", "(": ")", ")": "(", "{": "}", "}": "{", "<": ">", ">": "<",
	"&": "⅋", "_": "‾", ";": "؛",
};

/** Combinante que se agrega DESPUÉS de cada carácter (no es un mapeo 1→1). */
type Combining = { combining: string };

type StyleTransform = Map<string, string> | Combining | ((text: string) => string);

const TRANSFORMS: Record<string, StyleTransform> = {
	cursiva: expand([
		{ from: "A", start: 0x1d49c, holes: SCRIPT_HOLES },
		{ from: "a", start: 0x1d4b6, holes: SCRIPT_HOLES },
	]),
	"cursiva-negrita": expand([
		{ from: "A", start: 0x1d4d0 },
		{ from: "a", start: 0x1d4ea },
	]),
	goticas: expand([
		{ from: "A", start: 0x1d504, holes: FRAKTUR_HOLES },
		{ from: "a", start: 0x1d51e, holes: FRAKTUR_HOLES },
	]),
	"goticas-negrita": expand([
		{ from: "A", start: 0x1d56c },
		{ from: "a", start: 0x1d586 },
	]),
	burbuja: new Map([
		...expand([
			{ from: "A", start: 0x24b6 },
			{ from: "a", start: 0x24d0 },
		]),
		...table("0123456789", ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"]),
	]),
	"burbuja-negra": new Map([
		// Sólo hay versión en mayúscula: la minúscula se mapea al mismo glifo.
		...expand([{ from: "A", start: 0x1f150 }]),
		...table(LOWER, [...UPPER].map((c) => String.fromCodePoint(0x1f150 + c.codePointAt(0)! - 65))),
		...table("0123456789", ["⓿", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾"]),
	]),
	cuadrada: new Map([
		...expand([{ from: "A", start: 0x1f130 }]),
		...table(LOWER, [...UPPER].map((c) => String.fromCodePoint(0x1f130 + c.codePointAt(0)! - 65))),
	]),
	invertida: (text: string) => {
		const map = new Map<string, string>([
			...table(LOWER, UPSIDE_DOWN_LOWER),
			...table(UPPER, UPSIDE_DOWN_UPPER),
			...Object.entries(UPSIDE_DOWN_EXTRA),
		]);
		return [...text]
			.map((c) => map.get(c) ?? c)
			.reverse()
			.join("");
	},
	pequenas: new Map([...table(LOWER, SMALL_CAPS), ...table(UPPER, SMALL_CAPS)]),
	monoespaciada: expand([
		{ from: "A", start: 0x1d670 },
		{ from: "a", start: 0x1d68a },
		{ from: "0", start: 0x1d7f6 },
	]),
	doble: expand([
		{ from: "A", start: 0x1d538, holes: DOUBLE_HOLES },
		{ from: "a", start: 0x1d552, holes: DOUBLE_HOLES },
		{ from: "0", start: 0x1d7d8 },
	]),
	negrita: expand([
		{ from: "A", start: 0x1d400 },
		{ from: "a", start: 0x1d41a },
		{ from: "0", start: 0x1d7ce },
	]),
	tachada: { combining: "̶" },
	espaciada: new Map([
		...expand([
			{ from: "A", start: 0xff21 },
			{ from: "a", start: 0xff41 },
			{ from: "0", start: 0xff10 },
		]),
		[" ", "　"],
	]),
};

/**
 * Aplica un estilo a un texto. Si el estilo no existe devuelve el texto tal cual:
 * una ruta desconocida muestra el original, no una página vacía.
 */
export function applyStyle(styleId: string, text: string): string {
	const transform = TRANSFORMS[styleId];
	if (!transform) return text;
	if (typeof transform === "function") return transform(text);
	if ("combining" in transform) return [...text].map((c) => (c === " " ? c : c + transform.combining)).join("");
	return [...text].map((c) => transform.get(c) ?? c).join("");
}

/** `true` si el estilo está implementado (lo usa el router para el 404). */
export function hasStyle(styleId: string): boolean {
	return styleId in TRANSFORMS;
}
