/**
 * Catálogo de generadores: la única fuente de verdad de qué rutas existen.
 *
 * Vive en la raíz de la app —y no en `src/`— porque lo consumen dos mundos que no
 * comparten bundle: `index.ts`, que corre en el kernel y arma el sitemap y los
 * meta por ruta, y el front, que arma las pestañas y el router desde acá mismo.
 * Es TypeScript plano a propósito: sin JSX, sin CSS y sin imports del navegador.
 *
 * Sumar un generador o un estilo es agregar una entrada. Las rutas son parte del
 * producto, no un detalle: cada estilo tiene URL propia porque es de donde viene
 * el tráfico, y una sola ruta con pestañas no se indexa.
 */

/** Grupos de primer nivel: uno por pestaña y por sección del sitemap. */
export type GeneratorId = "letras" | "paletas" | "tipografias" | "texto";

export interface GeneratorGroup {
	id: GeneratorId;
	/** Ruta índice del grupo. */
	path: string;
	label: string;
	/** Texto corto para la tarjeta del índice y el `description` por defecto. */
	summary: string;
}

export const GENERATOR_GROUPS: readonly GeneratorGroup[] = [
	{
		id: "letras",
		path: "/letras",
		label: "Letras",
		summary: "Convertí tu texto a caracteres Unicode decorativos y copialos donde quieras.",
	},
	{
		id: "paletas",
		path: "/paletas",
		label: "Paletas",
		summary: "Generá paletas de color, fijá las que te gustan y comprobá el contraste.",
	},
	{
		id: "tipografias",
		path: "/tipografias",
		label: "Tipografías",
		summary: "Escribí con tipografías libres y descargá el resultado como imagen.",
	},
	{
		id: "texto",
		path: "/texto",
		label: "Texto",
		summary: "Utilidades de texto: mayúsculas, slugs, acentos, conteo y relleno.",
	},
] as const;

export interface CatalogEntry {
	/** Último segmento de la ruta. */
	slug: string;
	label: string;
	description: string;
}

/**
 * Estilos del conversor Unicode.
 *
 * No son tipografías: son puntos de código distintos que la mayoría de las
 * plataformas acepta en un campo de texto plano. Por eso funcionan en una bio de
 * Instagram y por eso los lectores de pantalla los leen mal — la advertencia de
 * accesibilidad es parte de la página, no una nota al pie.
 */
export const LETTER_STYLES: readonly CatalogEntry[] = [
	{ slug: "cursiva", label: "Cursiva", description: "Letras cursivas para copiar y pegar en tu bio, tus historias o tu perfil." },
	{ slug: "cursiva-negrita", label: "Cursiva negrita", description: "Cursiva con trazo grueso, para títulos cortos que tienen que resaltar." },
	{ slug: "goticas", label: "Góticas", description: "Letras góticas (fraktur) para copiar y pegar donde quieras." },
	{ slug: "goticas-negrita", label: "Góticas negrita", description: "Góticas de trazo grueso, más legibles en pantallas chicas." },
	{ slug: "burbuja", label: "Burbuja", description: "Letras dentro de un círculo, para separar secciones o numerar." },
	{ slug: "burbuja-negra", label: "Burbuja negra", description: "Círculos rellenos con la letra calada: máximo contraste." },
	{ slug: "cuadrada", label: "Cuadrada", description: "Letras encerradas en un cuadrado, con aire retro." },
	{ slug: "invertida", label: "Invertida", description: "Tu texto al revés, dado vuelta letra por letra." },
	{ slug: "pequenas", label: "Versalitas", description: "Mayúsculas pequeñas para escribir sin gritar." },
	{ slug: "monoespaciada", label: "Monoespaciada", description: "Ancho fijo, como una consola, para que todo quede alineado." },
	{ slug: "doble", label: "Doble trazo", description: "Letras de doble contorno, las mismas que usa la notación matemática." },
	{ slug: "negrita", label: "Negrita", description: "Negrita real en Unicode: se copia y se pega sin perder el formato." },
	{ slug: "tachada", label: "Tachada", description: "Texto con una línea encima, sin depender del editor donde lo pegues." },
	{ slug: "espaciada", label: "Espaciada", description: "Texto de ancho completo, con aire entre cada letra." },
] as const;

/** Utilidades de texto: cada una es una transformación local, sin servidor. */
export const TEXT_TOOLS: readonly CatalogEntry[] = [
	{ slug: "mayusculas", label: "Mayúsculas y minúsculas", description: "Pasá un texto a mayúsculas, minúsculas, capitalizado o alternado." },
	{ slug: "slug", label: "Slug para URL", description: "Convertí un título en una URL limpia, sin acentos ni símbolos." },
	{ slug: "sin-acentos", label: "Quitar acentos", description: "Sacá tildes y diéresis conservando el resto del texto." },
	{ slug: "contador", label: "Contador de caracteres", description: "Contá caracteres, palabras, líneas y párrafos mientras escribís." },
	{ slug: "lorem-ipsum", label: "Texto de relleno", description: "Generá párrafos de relleno para maquetar, en latín o en español." },
	{ slug: "reparar-texto", label: "Reparar texto", description: "Arreglá el texto que se ve como Ã¡ o â€œ por una codificación mal leída." },
	{ slug: "ordenar-lineas", label: "Ordenar líneas", description: "Ordená alfabéticamente, invertí o quitá líneas repetidas." },
] as const;

/** Sub-herramientas del grupo de paletas. */
export const PALETTE_TOOLS: readonly CatalogEntry[] = [
	{ slug: "contraste", label: "Contraste", description: "Comprobá si dos colores cumplen el contraste mínimo de WCAG AA y AAA." },
	{ slug: "desde-imagen", label: "Desde una imagen", description: "Extraé los colores dominantes de una imagen sin subirla a ningún lado." },
] as const;

export interface GeneratorPage {
	path: string;
	group: GeneratorId;
	title: string;
	description: string;
	/** Prioridad en el sitemap. */
	priority: number;
}

function pages(group: GeneratorId, base: string, entries: readonly CatalogEntry[], priority: number): GeneratorPage[] {
	return entries.map((e) => ({
		path: `${base}/${e.slug}`,
		group,
		title: e.label,
		description: e.description,
		priority,
	}));
}

/** Todas las rutas públicas de la app, en el orden en que se listan. */
export const GENERATOR_PAGES: readonly GeneratorPage[] = [
	...GENERATOR_GROUPS.map((g) => ({ path: g.path, group: g.id, title: g.label, description: g.summary, priority: 0.8 })),
	...pages("letras", "/letras", LETTER_STYLES, 0.7),
	...pages("paletas", "/paletas", PALETTE_TOOLS, 0.7),
	...pages("texto", "/texto", TEXT_TOOLS, 0.7),
];

/** Devuelve la página del catálogo que corresponde a un pathname, o `null`. */
export function findPage(pathname: string): GeneratorPage | null {
	const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
	return GENERATOR_PAGES.find((p) => p.path === normalized) ?? null;
}

/** Grupo activo para un pathname (para marcar la pestaña). `null` en la portada. */
export function groupOf(pathname: string): GeneratorId | null {
	return findPage(pathname)?.group ?? null;
}
