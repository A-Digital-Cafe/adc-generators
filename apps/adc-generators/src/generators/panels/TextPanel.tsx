import { useMemo } from "react";
import { TEXT_TOOLS } from "../../../catalog.ts";
import { changeCase, countStats, lorem, repairMojibake, slugify, sortLines, stripAccents, type CaseMode } from "../text-tools.ts";
import { CopyField } from "../../components/CopyField.tsx";
import { GeneratorShell } from "../../components/GeneratorShell.tsx";
import { ToolChips } from "../../components/ToolChips.tsx";
import { useLocalDraft } from "../../hooks/useLocalDraft.ts";
import { useT } from "../../hooks/useT.ts";

const CASE_MODES: readonly { value: CaseMode; label: string }[] = [
	{ value: "mayusculas", label: "MAYÚSCULAS" },
	{ value: "minusculas", label: "minúsculas" },
	{ value: "capitalizado", label: "Por oración" },
	{ value: "titulo", label: "Por Palabra" },
	{ value: "alternado", label: "aLtErNaDo" },
	{ value: "invertido", label: "Invertir caso" },
];

/** Estado de las herramientas que tienen opciones, en un solo objeto persistible. */
interface TextOptions {
	separator: "-" | "_";
	lowercase: boolean;
	loremLanguage: "la" | "es";
	loremParagraphs: number;
	sortOrder: "asc" | "desc" | "invertir" | "aleatorio";
	dedupe: boolean;
}

const DEFAULTS: TextOptions = {
	separator: "-",
	lowercase: true,
	loremLanguage: "es",
	loremParagraphs: 3,
	sortOrder: "asc",
	dedupe: false,
};

function Stats({ text }: { readonly text: string }) {
	const stats = useMemo(() => countStats(text), [text]);
	const rows: readonly [string, number | string][] = [
		["Caracteres", stats.characters],
		["Sin espacios", stats.charactersNoSpaces],
		["Palabras", stats.words],
		["Oraciones", stats.sentences],
		["Líneas", stats.lines],
		["Párrafos", stats.paragraphs],
		["Lectura", `${stats.readingMinutes} min`],
	];
	return (
		<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
			{rows.map(([label, value]) => (
				<div key={label} className="rounded-md border border-text/10 p-3">
					<dt className="font-text text-[11px] uppercase tracking-wide text-muted">{label}</dt>
					<dd className="font-heading text-2xl text-text">{value}</dd>
				</div>
			))}
		</dl>
	);
}

/** Resultado largo: textarea de sólo lectura con su botón de copiar arriba. */
function LongResult({ label, value }: { readonly label: string; readonly value: string }) {
	return (
		<adc-card class="block p-4">
			<CopyField label={label} value={value} showValue={false} />
			<adc-textarea value={value} rows={10} readOnly aria-label={label} class="mt-3 block" />
		</adc-card>
	);
}

/**
 * Utilidades de texto. Todas comparten el mismo campo de entrada y el mismo
 * borrador, así cambiar de herramienta no obliga a volver a pegar el texto — que es
 * el gesto que hace abandonar estas páginas.
 */
export function TextPanel({ toolSlug }: { readonly toolSlug?: string }) {
	const t = useT();
	const [text, setText] = useLocalDraft("texto.input", "");
	const [options, setOptions] = useLocalDraft<TextOptions>("texto.options", DEFAULTS);
	const tool = TEXT_TOOLS.find((t) => t.slug === toolSlug) ?? TEXT_TOOLS[0];
	const set = <K extends keyof TextOptions>(key: K, value: TextOptions[K]) => setOptions({ ...options, [key]: value });

	// El relleno es el único que no parte del texto de entrada: se regenera al cambiar
	// las opciones, no al escribir.
	const generated = useMemo(
		() => lorem({ language: options.loremLanguage, paragraphs: options.loremParagraphs, wordsPerParagraph: 45, startWithLorem: true }),
		[options.loremLanguage, options.loremParagraphs]
	);

	return (
		<GeneratorShell title={tool.label} description={tool.description}>
			<ToolChips
				label={t("text.toolsNav", undefined, "Herramientas de texto")}
				items={TEXT_TOOLS.map((other) => ({ href: `/texto/${other.slug}`, label: other.label, active: other.slug === tool.slug }))}
			/>

			{tool.slug !== "lorem-ipsum" && (
				<label className="mb-4 block">
					<span className="mb-1 block font-text text-sm text-muted">{t("letters.inputLabel", undefined, "Tu texto")}</span>
					<adc-textarea
						value={text}
						rows={6}
						placeholder="Pegá o escribí acá"
						aria-label="Texto de entrada"
						onInput={(e: React.FormEvent) => setText((e.target as HTMLTextAreaElement).value)}
					/>
				</label>
			)}

			{tool.slug === "contador" && <Stats text={text} />}

			{tool.slug === "mayusculas" && (
				<adc-card class="block p-4 lg:grid lg:grid-cols-2 lg:gap-x-6">
					{CASE_MODES.map((mode) => (
						<CopyField key={mode.value} label={mode.label} value={changeCase(text, mode.value)} />
					))}
				</adc-card>
			)}

			{tool.slug === "sin-acentos" && (
				<adc-card class="block p-4">
					<CopyField label="Sin tildes ni diéresis" value={stripAccents(text)} />
					<p className="pt-2 font-text text-[11px] text-muted">
						La <strong>ñ</strong> se conserva: no es una n con tilde sino otra letra, y cambiarla cambia la palabra.
					</p>
				</adc-card>
			)}

			{tool.slug === "slug" && (
				<>
					<div className="mb-3 flex flex-wrap items-center gap-4">
{/* `adc-select` y no `adc-segmented`: el segmentado dibuja botones cuadrados de
						    tamaño fijo pensados para iconos, y con rótulos de texto los recorta. */}
						<adc-select
							value={options.separator}
							options={JSON.stringify([
								{ value: "-", label: "Separar con guion" },
								{ value: "_", label: "Separar con guion bajo" },
							])}
							class="min-w-56"
							onadcChange={(e: Event) => set("separator", (e as CustomEvent<string>).detail as "-" | "_")}
						/>
						<adc-toggle
							checked={options.lowercase}
							label="Todo en minúsculas"
							size="small"
							onadcChange={(e: Event) => set("lowercase", (e as CustomEvent<boolean>).detail)}
						/>
					</div>
					<adc-card class="block p-4">
						<CopyField label="Slug" value={slugify(text, { separator: options.separator, lowercase: options.lowercase })} monospace />
					</adc-card>
				</>
			)}

			{tool.slug === "reparar-texto" && (
				<adc-card class="block p-4">
					<CopyField label="Texto reparado" value={repairMojibake(text)} />
					<p className="pt-2 font-text text-[11px] text-muted">
						Si el texto ya está bien, se devuelve igual: se repara sólo lo que se decodifica entero como UTF-8, que es la firma del
						doble encoding.
					</p>
				</adc-card>
			)}

			{tool.slug === "ordenar-lineas" && (
				<>
					<div className="mb-3 flex flex-wrap items-center gap-4">
<adc-select
							value={options.sortOrder}
							options={JSON.stringify([
								{ value: "asc", label: "Alfabético (A → Z)" },
								{ value: "desc", label: "Alfabético inverso (Z → A)" },
								{ value: "invertir", label: "Invertir el orden actual" },
								{ value: "aleatorio", label: "Al azar" },
							])}
							class="min-w-56"
							onadcChange={(e: Event) => set("sortOrder", (e as CustomEvent<string>).detail as TextOptions["sortOrder"])}
						/>
						<adc-toggle
							checked={options.dedupe}
							label="Quitar repetidas"
							size="small"
							onadcChange={(e: Event) => set("dedupe", (e as CustomEvent<boolean>).detail)}
						/>
					</div>
					<LongResult
						label="Líneas ordenadas"
						value={sortLines(text, {
							order: options.sortOrder,
							dedupe: options.dedupe,
							trim: true,
							ignoreCase: true,
							numeric: true,
							removeEmpty: true,
						})}
					/>
				</>
			)}

			{tool.slug === "lorem-ipsum" && (
				<>
					<div className="mb-3 flex flex-wrap items-center gap-4">
<adc-select
							value={options.loremLanguage}
							options={JSON.stringify([
								{ value: "es", label: "En español" },
								{ value: "la", label: "Lorem ipsum" },
							])}
							class="min-w-48"
							onadcChange={(e: Event) => set("loremLanguage", (e as CustomEvent<string>).detail as "la" | "es")}
						/>
						<adc-slider
							label="Párrafos"
							value={options.loremParagraphs}
							min={1}
							max={10}
							step={1}
							class="min-w-48 flex-1"
							onadcChange={(e: Event) => set("loremParagraphs", (e as CustomEvent<number>).detail)}
						/>
					</div>
					<LongResult label="Texto generado" value={generated} />
				</>
			)}
		</GeneratorShell>
	);
}
