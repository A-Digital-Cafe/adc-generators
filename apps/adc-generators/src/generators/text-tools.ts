/**
 * Utilidades de texto: transformaciones puras, todas locales. Ninguna consume
 * cuota ni pasa por el servidor — son el piso gratuito que sostiene el tráfico.
 */

/* ---------- mayúsculas y minúsculas ---------- */

export type CaseMode = "mayusculas" | "minusculas" | "capitalizado" | "titulo" | "alternado" | "invertido";

/** Palabras que un título en español deja en minúscula salvo al principio. */
const MINOR_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "u", "en", "a", "al", "un", "una", "por", "para", "con"]);

export function changeCase(text: string, mode: CaseMode): string {
	switch (mode) {
		case "mayusculas":
			return text.toLocaleUpperCase("es");
		case "minusculas":
			return text.toLocaleLowerCase("es");
		case "capitalizado":
			// Por oración, no por palabra: capitalizar cada palabra es "título", que es otro modo.
			return text
				.toLocaleLowerCase("es")
				.replace(/(^|[.!?¡¿]\s*)(\p{Ll})/gu, (_, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("es"));
		case "titulo":
			return text
				.toLocaleLowerCase("es")
				.split(/(\s+)/)
				// Sin ancla: la primera letra del token, no el primer carácter — si no, "¿vení"
				// se queda en minúscula porque el token empieza con el signo de apertura.
				.map((token, i) => (i > 0 && MINOR_WORDS.has(token) ? token : token.replace(/\p{Ll}/u, (c) => c.toLocaleUpperCase("es"))))
				.join("");
		case "alternado":
			return [...text].map((c, i) => (i % 2 === 0 ? c.toLocaleLowerCase("es") : c.toLocaleUpperCase("es"))).join("");
		case "invertido":
			return [...text]
				.map((c) => {
					const upper = c.toLocaleUpperCase("es");
					return c === upper ? c.toLocaleLowerCase("es") : upper;
				})
				.join("");
	}
}

/* ---------- acentos y slugs ---------- */

/** Tilde combinante (U+0303): la que compone la ñ al descomponer en NFD. */
const COMBINING_TILDE = "̃";

/**
 * Quita tildes y diéresis conservando la **ñ**, que no es una n con tilde sino otra
 * letra del alfabeto: normalizarla a `n` cambia la palabra (`año` deja de ser `año`).
 */
export function stripAccents(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, (mark, offset: number, whole: string) =>
			mark === COMBINING_TILDE && /[nN]/.test(whole[offset - 1] ?? "") ? mark : ""
		)
		.normalize("NFC");
}

export interface SlugOptions {
	separator: "-" | "_";
	lowercase: boolean;
}

export function slugify(text: string, options: SlugOptions = { separator: "-", lowercase: true }): string {
	// Acá la ñ SÍ se translitera: un slug es ASCII por definición.
	const base = stripAccents(text)
		.replace(/ñ/g, "n")
		.replace(/Ñ/g, "N")
		.replace(/[^\p{L}\p{N}]+/gu, options.separator)
		.replace(new RegExp(`^\\${options.separator}+|\\${options.separator}+$`, "g"), "");
	return options.lowercase ? base.toLocaleLowerCase("es") : base;
}

/* ---------- conteo ---------- */

export interface TextStats {
	characters: number;
	charactersNoSpaces: number;
	words: number;
	lines: number;
	paragraphs: number;
	sentences: number;
	/** Minutos de lectura a 200 palabras por minuto, redondeado hacia arriba. */
	readingMinutes: number;
}

export function countStats(text: string): TextStats {
	const words = text.trim() ? text.trim().split(/\s+/).length : 0;
	return {
		// Por puntos de código: con `.length` un emoji cuenta dos y el número queda mal.
		characters: [...text].length,
		charactersNoSpaces: [...text.replace(/\s/g, "")].length,
		words,
		lines: text ? text.split(/\r\n|\r|\n/).length : 0,
		paragraphs: text.split(/(?:\r?\n){2,}/).filter((p) => p.trim()).length,
		sentences: (text.match(/[^.!?…]+[.!?…]+/g) ?? []).length + (/[^.!?…\s][^.!?…]*$/.test(text.trim()) ? 1 : 0),
		readingMinutes: Math.ceil(words / 200),
	};
}

/* ---------- texto de relleno ---------- */

const LOREM_LA =
	"lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(
		" "
	);

const LOREM_ES =
	"café molido de especialidad taza cortada barra madera mañana templada aroma tostado grano origen filtro lento espuma leche vaporizada azúcar rubia cuchara pequeña ventana lluvia libro abierto conversación pausada mesa esquina música baja tarde larga apunte cuaderno lápiz silla mostrador vecindario calle arbolada plaza banco sombra".split(
		" "
	);

export interface LoremOptions {
	language: "la" | "es";
	paragraphs: number;
	/** Palabras por párrafo (aproximado: la última oración se cierra entera). */
	wordsPerParagraph: number;
	startWithLorem: boolean;
}

export function lorem(options: LoremOptions): string {
	const bank = options.language === "es" ? LOREM_ES : LOREM_LA;
	const pick = () => bank[Math.floor(Math.random() * bank.length)];

	return Array.from({ length: Math.max(1, options.paragraphs) }, (_, p) => {
		const words: string[] = [];
		if (p === 0 && options.startWithLorem && options.language === "la") words.push("lorem", "ipsum", "dolor", "sit", "amet");
		while (words.length < Math.max(8, options.wordsPerParagraph)) words.push(pick());

		// Cortar en oraciones de 8 a 16 palabras: un párrafo de una sola oración larga no
		// sirve para maquetar, que es para lo que se usa el relleno.
		const sentences: string[] = [];
		for (let i = 0; i < words.length; ) {
			const size = 8 + Math.floor(Math.random() * 9);
			const chunk = words.slice(i, i + size);
			if (!chunk.length) break;
			const first = `${chunk[0].charAt(0).toLocaleUpperCase("es")}${chunk[0].slice(1)}`;
			sentences.push(`${[first, ...chunk.slice(1)].join(" ")}.`);
			i += size;
		}
		return sentences.join(" ");
	}).join("\n\n");
}

/* ---------- reparación de codificación ---------- */

/**
 * Caracteres que Windows-1252 asigna en 0x80-0x9F. Al leer UTF-8 como 1252, esos
 * bytes salen como estos glifos en vez de como controles: para volver atrás hay que
 * mapearlos al byte original.
 */
const WINDOWS_1252_REVERSE = new Map<string, number>([
	["€", 0x80], ["‚", 0x82], ["ƒ", 0x83], ["„", 0x84], ["…", 0x85],
	["†", 0x86], ["‡", 0x87], ["ˆ", 0x88], ["‰", 0x89], ["Š", 0x8a],
	["‹", 0x8b], ["Œ", 0x8c], ["Ž", 0x8e], ["‘", 0x91], ["’", 0x92],
	["“", 0x93], ["”", 0x94], ["•", 0x95], ["–", 0x96], ["—", 0x97],
	["˜", 0x98], ["™", 0x99], ["š", 0x9a], ["›", 0x9b], ["œ", 0x9c],
	["ž", 0x9e], ["Ÿ", 0x9f],
]);

function decodeUtf8(bytes: Uint8Array): string | null {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

/**
 * Arregla el texto que se ve como `Ã¡` o `â€œ`: bytes UTF-8 que alguien leyó como
 * Latin-1 o Windows-1252. Se reinterpreta cada carácter como el byte que lo produjo
 * y se vuelve a decodificar.
 *
 * No hay heurística de detección y es a propósito: el decodificador **estricto** es
 * la detección. Un texto sano en español (`café` = `…0xE9`) no es UTF-8 válido leído
 * como bytes, así que falla y se devuelve intacto; sólo pasa lo que se decodifica
 * entero sin un solo byte inválido, que es justamente la firma del doble encoding.
 */
export function repairMojibake(text: string): string {
	const bytes = [...text].map((c) => WINDOWS_1252_REVERSE.get(c) ?? c.codePointAt(0)!);
	if (bytes.some((b) => b > 0xff)) return text;
	const repaired = decodeUtf8(new Uint8Array(bytes));
	return repaired && repaired !== text ? repaired : text;
}

/* ---------- ordenar líneas ---------- */

export interface SortOptions {
	order: "asc" | "desc" | "invertir" | "aleatorio";
	dedupe: boolean;
	trim: boolean;
	ignoreCase: boolean;
	numeric: boolean;
	removeEmpty: boolean;
}

export function sortLines(text: string, options: SortOptions): string {
	let lines = text.split(/\r\n|\r|\n/);
	if (options.trim) lines = lines.map((l) => l.trim());
	if (options.removeEmpty) lines = lines.filter((l) => l.trim());
	if (options.dedupe) {
		const seen = new Set<string>();
		lines = lines.filter((l) => {
			const key = options.ignoreCase ? l.toLocaleLowerCase("es") : l;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	if (options.order === "invertir") return lines.reverse().join("\n");
	if (options.order === "aleatorio") {
		for (let i = lines.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[lines[i], lines[j]] = [lines[j], lines[i]];
		}
		return lines.join("\n");
	}

	const collator = new Intl.Collator("es", { numeric: options.numeric, sensitivity: options.ignoreCase ? "base" : "variant" });
	lines.sort(collator.compare);
	if (options.order === "desc") lines.reverse();
	return lines.join("\n");
}
