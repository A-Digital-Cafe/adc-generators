import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaletteColor } from "@common/types/generators/index.ts";
import { PALETTE_TOOLS } from "../../../catalog.ts";
import {
	contrastVerdict,
	extractDominant,
	generatePalette,
	nameColor,
	readableOn,
	serializeTokens,
	type HarmonyMode,
	type TokenFormat,
} from "../palette.ts";
import { CopyField } from "../../components/CopyField.tsx";
import { GeneratorShell } from "../../components/GeneratorShell.tsx";
import { usePlanGate } from "../../components/PlanGate.tsx";
import { ToolChips } from "../../components/ToolChips.tsx";
import { copyToClipboard, downloadText } from "../../export/download.ts";
import { useLocalDraft } from "../../hooks/useLocalDraft.ts";
import { useLimits } from "../../hooks/useLimits.ts";
import { useT } from "../../hooks/useT.ts";
import { saveBrandKitToDrive } from "../../drive/brandKit.ts";
import RemoteFolderPicker from "../../drive/RemoteFolderPicker.tsx";

const HARMONIES: readonly { value: HarmonyMode; label: string }[] = [
	{ value: "analoga", label: "Análoga" },
	{ value: "complementaria", label: "Complementaria" },
	{ value: "triada", label: "Tríada" },
	{ value: "monocromatica", label: "Monocromática" },
	{ value: "aleatoria", label: "Al azar" },
];

const TOKEN_FORMATS: readonly { value: TokenFormat; label: string; ext: string; mime: string }[] = [
	{ value: "css", label: "Variables CSS", ext: "css", mime: "text/css" },
	{ value: "tailwind", label: "Tema de Tailwind", ext: "js", mime: "text/javascript" },
	{ value: "json", label: "JSON", ext: "json", mime: "application/json" },
];

/** Miniatura a la que se reduce la imagen antes de cuantizar: alcanza y corre en un frame. */
const SAMPLE_EDGE = 160;

/**
 * Muestra de color. Con `onToggleLock` el clic fija el color; sin él —la paleta
 * sacada de una imagen, que no se regenera— copia el hex, porque un botón que no
 * hace nada al tocarlo se lee como algo roto.
 */
function Swatch({ color, onToggleLock }: { readonly color: PaletteColor; readonly onToggleLock?: () => void }) {
	const t = useT();
	const ink = readableOn(color.hex);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 1600);
		return () => clearTimeout(timer);
	}, [copied]);

	const copyLabel = t("actions.copy", undefined, "Copiar");
	const action = onToggleLock ?? (() => void copyToClipboard(color.hex).then(setCopied));
	let hint = `Tocar para copiar ${color.hex}.`;
	if (onToggleLock) hint = color.locked ? "Fijado. Tocar para soltar." : "Sin fijar. Tocar para fijar.";

	return (
		<button
			type="button"
			onClick={action}
			style={{ backgroundColor: color.hex, color: ink }}
			className="flex h-32 flex-1 flex-col items-center justify-end gap-1 rounded-md p-3 transition-transform hover:scale-[1.02] sm:h-56"
			aria-pressed={onToggleLock ? (color.locked ?? false) : undefined}
			aria-label={`${color.name ?? color.hex}. ${hint}`}
		>
			<span aria-hidden="true" className="text-lg">
				{color.locked ? "🔒" : ""}
			</span>
			<span className="font-mono text-sm uppercase">{color.hex}</span>
			<span className="font-text text-[11px] opacity-80">
				{copied ? t("actions.copied", undefined, "¡Copiado!") : (color.name ?? copyLabel)}
			</span>
		</button>
	);
}

function ContrastTool() {
	const t = useT();
	const [pair, setPair] = useLocalDraft("paletas.contraste", { fg: "#2b1608", bg: "#fff4ec" });
	const verdict = useMemo(() => contrastVerdict(pair.fg, pair.bg), [pair.fg, pair.bg]);
	const badge = (level: string) => (level === "falla" ? "red" : level === "AA" ? "yellow" : "green");

	return (
		<>
			<div className="mb-4 flex flex-wrap gap-4">
				<adc-color-picker
					label={t("palette.fgLabel", undefined, "Texto")}
					value={pair.fg}
					onadcChange={(e: Event) => setPair({ ...pair, fg: (e as CustomEvent<string>).detail })}
				/>
				<adc-color-picker
					label={t("typography.backgroundLabel", undefined, "Fondo")}
					value={pair.bg}
					onadcChange={(e: Event) => setPair({ ...pair, bg: (e as CustomEvent<string>).detail })}
				/>
			</div>

			<div style={{ backgroundColor: pair.bg, color: pair.fg }} className="mb-4 rounded-md border border-text/10 p-6">
				<p className="font-heading text-3xl">Texto grande de ejemplo</p>
				<p className="mt-2">Texto normal de ejemplo, del tamaño en que se lee un párrafo cualquiera de esta página.</p>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<span className="font-heading text-3xl text-text">{verdict.ratio.toFixed(2)}:1</span>
				<adc-badge color={badge(verdict.normal)}>Texto normal: {verdict.normal}</adc-badge>
				<adc-badge color={badge(verdict.large)}>Texto grande: {verdict.large}</adc-badge>
				<adc-badge color={verdict.ui ? "green" : "red"}>Controles: {verdict.ui ? "pasa" : "falla"}</adc-badge>
			</div>
			<p className="mt-3 font-text text-[11px] text-muted">
				{t(
					"palette.contrastLegend",
					undefined,
					"Umbrales de WCAG 2.1: AA pide 4,5:1 en texto normal y 3:1 en texto grande o componentes de interfaz; AAA pide 7:1 y 4,5:1."
				)}
			</p>
		</>
	);
}

function FromImageTool({ onUse }: { readonly onUse: (colors: PaletteColor[]) => void }) {
	const t = useT();
	const fileRef = useRef<HTMLInputElement>(null);
	const [colors, setColors] = useState<PaletteColor[]>([]);
	const [error, setError] = useState<string | null>(null);

	const handleFile = useCallback(async (file: File) => {
		setError(null);
		try {
			const bitmap = await createImageBitmap(file);
			const scale = SAMPLE_EDGE / Math.max(bitmap.width, bitmap.height);
			const width = Math.max(1, Math.round(bitmap.width * Math.min(1, scale)));
			const height = Math.max(1, Math.round(bitmap.height * Math.min(1, scale)));
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
			ctx.drawImage(bitmap, 0, 0, width, height);
			bitmap.close();
			setColors(extractDominant(ctx.getImageData(0, 0, width, height).data));
		} catch {
			setError(t("palette.imageError", undefined, "No se pudo leer esa imagen. Probá con un PNG, JPG o WEBP."));
		}
	}, []);

	return (
		<>
			<adc-callout tone="info" role="note" class="mb-4 block">
				<p className="text-sm">
					{t(
						"palette.imageNotice",
						undefined,
						"La imagen no se sube a ningún lado: se lee en tu navegador, se reduce a una miniatura y se descarta. No queda copia en nuestros servidores porque nunca llega a ellos."
					)}
				</p>
			</adc-callout>

			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) void handleFile(file);
				}}
			/>
			<adc-button variant="primary" label={t("actions.chooseImage", undefined, "Elegir una imagen")} onClick={() => fileRef.current?.click()} />

			{error && (
				<adc-callout tone="error" role="alert" class="mt-4 block">
					<p className="text-sm">{error}</p>
				</adc-callout>
			)}

			{colors.length > 0 && (
				<>
					<div className="mt-4 flex flex-wrap gap-2 sm:flex-nowrap">
						{colors.map((color) => (
							<Swatch key={color.hex} color={color} />
						))}
					</div>
					<adc-button class="mt-4 inline-block" variant="accent-outlined" label={t("actions.usePalette", undefined, "Usar como paleta")} onClick={() => onUse(colors)} />
				</>
			)}
		</>
	);
}

/**
 * Generador de paletas.
 *
 * La barra espaciadora regenera y el clic fija un color: es el gesto que ya conoce
 * cualquiera que haya usado un generador de paletas, y copiarlo vale más que
 * inventar uno propio. Lo que se gatea por plan es exportar tokens y guardar el
 * kit; generar y copiar hex no se gatea nunca.
 */
export function PalettePanel({ toolSlug }: { readonly toolSlug?: string }) {
	const tool = PALETTE_TOOLS.find((t) => t.slug === toolSlug);
	const t = useT();
	const { limits } = useLimits();
	const plan = usePlanGate();
	const [palette, setPalette] = useLocalDraft<PaletteColor[]>("paletas.current", []);
	const [mode, setMode] = useLocalDraft<HarmonyMode>("paletas.mode", "analoga");
	const [format, setFormat] = useState<TokenFormat>("css");
	const [picking, setPicking] = useState(false);
	const [saved, setSaved] = useState<string | null>(null);

	const regenerate = useCallback(() => setPalette(generatePalette(palette, mode)), [palette, mode, setPalette]);

	// Primera paleta al montar: una pantalla vacía no comunica qué hace la herramienta.
	useEffect(() => {
		if (palette.length === 0) setPalette(generatePalette([], mode));
	}, [palette.length, mode, setPalette]);

	// Barra espaciadora global, salvo cuando el foco está en un control: ahí espacio
	// tiene que seguir activando el botón.
	useEffect(() => {
		if (tool) return;
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (e.code !== "Space" || target?.closest("input, textarea, button, select, [contenteditable]")) return;
			e.preventDefault();
			regenerate();
		};
		globalThis.addEventListener("keydown", onKey);
		return () => globalThis.removeEventListener("keydown", onKey);
	}, [regenerate, tool]);

	const toggleLock = (index: number) =>
		setPalette(palette.map((color, i) => (i === index ? { ...color, locked: !color.locked } : color)));

	const exportTokens = () => {
		if (!limits.tokenExport) {
			plan.ask(t("plan.tokenExport", undefined, "Exportar variables CSS, tema de Tailwind o JSON viene con los planes pagos."));
			return;
		}
		const spec = TOKEN_FORMATS.find((f) => f.value === format)!;
		downloadText(serializeTokens(palette, format), `paleta.${spec.ext}`, spec.mime);
	};

	const saveKit = async (folderId: string | null) => {
		setPicking(false);
		const file = await saveBrandKitToDrive("Paleta", palette, [], folderId);
		setSaved(
			file
				? t("palette.saved", { name: file.name }, `Guardado como ${file.name}`)
				: t("palette.saveFailed", undefined, "No se pudo guardar en tu Drive.")
		);
	};

	// Los tres modos del grupo son rutas propias, y hasta acá sólo se llegaba desde la
	// portada: sin este carril, `/paletas/contraste` era invisible desde `/paletas`.
	const chips = (
		<ToolChips
			label={t("palette.toolsNav", undefined, "Herramientas de color")}
			items={[
				{ href: "/paletas", label: t("palette.generatorChip", undefined, "Generador"), active: !tool },
				...PALETTE_TOOLS.map((entry) => ({
					href: `/paletas/${entry.slug}`,
					label: entry.label,
					active: entry.slug === tool?.slug,
				})),
			]}
		/>
	);

	if (tool?.slug === "contraste") {
		return (
			<GeneratorShell title={tool.label} description={tool.description}>
				{chips}
				<ContrastTool />
			</GeneratorShell>
		);
	}

	if (tool?.slug === "desde-imagen") {
		return (
			<GeneratorShell title={tool.label} description={tool.description}>
				{chips}
				<FromImageTool onUse={setPalette} />
			</GeneratorShell>
		);
	}

	return (
		<GeneratorShell title="Generador de paletas" description="Generá combinaciones, fijá las que te gustan y volvé a tirar el resto.">
			{chips}
			<div className="mb-4 flex flex-wrap items-center gap-3">
				{/* `adc-select` y no `adc-segmented`: el segmentado dibuja botones cuadrados de
				    tamaño fijo pensados para iconos, y con rótulos de texto los recorta. */}
				<adc-select
					value={mode}
					options={JSON.stringify(HARMONIES.map((h) => ({ value: h.value, label: h.label })))}
					class="min-w-48"
					onadcChange={(e: Event) => setMode((e as CustomEvent<string>).detail as HarmonyMode)}
				/>
				<adc-button variant="primary" label={t("actions.generate", undefined, "Generar")} onClick={regenerate} />
				<span className="font-text text-[11px] text-muted">
					{t("palette.hint", undefined, "Tocá un color para fijarlo · espacio para volver a tirar")}
				</span>
			</div>

			<div className="mb-4 flex flex-wrap gap-2 sm:flex-nowrap">
				{palette.map((color, i) => (
					<Swatch key={`${color.hex}-${i}`} color={color} onToggleLock={() => toggleLock(i)} />
				))}
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				<adc-card class="block p-4">
					<CopyField label={t("palette.allHex", undefined, "Todos los hex")} value={palette.map((c) => c.hex).join(", ")} monospace />
					{palette.map((color, i) => (
						<CopyField key={`copy-${i}`} label={color.name ?? nameColor(color.hex)} value={color.hex} monospace />
					))}
				</adc-card>

				<div className="space-y-5">
					<div>
						<h2 className="font-heading text-lg text-text">{t("palette.tokensTitle", undefined, "Exportar como tokens")}</h2>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<adc-select
								value={format}
								options={JSON.stringify(TOKEN_FORMATS.map((f) => ({ value: f.value, label: f.label })))}
								class="min-w-48"
								onadcChange={(e: Event) => setFormat((e as CustomEvent<string>).detail as TokenFormat)}
							/>
							{/* Habilitado aunque el plan no lo incluya: el clic es lo que abre la
							    explicación. Un botón muerto no cuenta lo que falta. */}
							<adc-button
								variant="accent-outlined"
								label={limits.tokenExport ? t("actions.download", undefined, "Descargar") : `${t("actions.download", undefined, "Descargar")} 🔒`}
								onClick={exportTokens}
							/>
						</div>
					</div>

					<div>
						<h2 className="font-heading text-lg text-text">{t("palette.driveTitle", undefined, "Guardar en tu Drive")}</h2>
						<p className="mt-1 text-sm text-muted">{t("palette.driveHint", undefined, "Queda como un archivo tuyo, con la paleta y sus nombres.")}</p>
						<adc-button
							class="mt-2 inline-block"
							variant="accent-outlined"
							label={limits.brandKits ? t("actions.chooseFolder", undefined, "Elegir carpeta") : `${t("actions.chooseFolder", undefined, "Elegir carpeta")} 🔒`}
							onClick={() =>
								limits.brandKits
									? setPicking(true)
									: plan.ask(t("plan.brandKits", undefined, "Guardar kits de marca viene con los planes pagos."))
							}
						/>
						{saved && <p className="mt-2 font-text text-[11px] text-muted">{saved}</p>}
					</div>
				</div>
			</div>

			{picking && (
				<adc-modal open modalTitle={t("palette.driveModal", undefined, "Elegí dónde guardarlo")} size="md" onadcClose={() => setPicking(false)}>
					<RemoteFolderPicker onChoose={(folderId) => void saveKit(folderId)} onCancel={() => setPicking(false)} />
				</adc-modal>
			)}
			{plan.dialog}
		</GeneratorShell>
	);
}
