import { useCallback, useEffect, useMemo, useState } from "react";
import { GENERATORS_FREE_LIMITS, canExportAt, isUnlimited, remaining, type ExportFormat, type ExportRequest } from "@common/types/generators/index.ts";
import { allFonts, fontsFor, fontStack } from "../../fonts/registry.ts";
import { canvasToBlob, renderText, supportsTransparency, DEFAULT_RENDER, type TextRenderOptions } from "../../export/render.ts";
import { downloadBlob, safeFileName } from "../../export/download.ts";
import { generatorsApi } from "../../api/generators-api.ts";
import { GeneratorShell } from "../../components/GeneratorShell.tsx";
import { LockChip, usePlanGate } from "../../components/PlanGate.tsx";
import { useLimits } from "../../hooks/useLimits.ts";
import { useLocalDraft } from "../../hooks/useLocalDraft.ts";
import { useT } from "../../hooks/useT.ts";

const FORMATS: readonly { value: ExportFormat; label: string; ext: string }[] = [
	{ value: "png", label: "PNG", ext: "png" },
	{ value: "jpg", label: "JPG", ext: "jpg" },
	{ value: "webp", label: "WEBP", ext: "webp" },
];

/** Escalones ofrecidos; los que superan el plan se muestran bloqueados, no ocultos. */
const SIZES: readonly number[] = [720, 1080, 1920, 2560, 4096];

/** Lado del preview: fijo y chico para que redibujar mientras se escribe no cueste. */
const PREVIEW_EDGE = 900;

const WATERMARK = "adigitalcafe.com";

/** Fallback en español de cada `errorKey` del servicio; la traducción vive en `i18n/`. */
const ERROR_FALLBACKS: Record<string, string> = {
	RESOLUTION_TOO_HIGH: "Esa resolución no está incluida en tu plan.",
	TRANSPARENCY_NOT_ALLOWED: "El fondo transparente no está incluido en tu plan.",
	UNSUPPORTED_FORMAT: "Ese formato no admite fondo transparente.",
	DAILY_QUOTA_EXCEEDED: "Llegaste al límite de exportaciones de hoy.",
	QUOTA_EXCEEDED: "Llegaste al límite de exportaciones de este mes.",
};

interface Draft {
	text: string;
	fontId: string;
	color: string;
	background: string;
	transparent: boolean;
	format: ExportFormat;
	longEdge: number;
}

const DEFAULT_DRAFT: Draft = {
	text: "Tu texto acá",
	fontId: DEFAULT_RENDER.fontId,
	color: DEFAULT_RENDER.color,
	background: DEFAULT_RENDER.background,
	transparent: false,
	format: "png",
	longEdge: 1080,
};

/**
 * Texto con tipografías libres → imagen. Es el único generador que produce un
 * archivo y por lo tanto el único que consume cuota.
 *
 * El preview se dibuja con el **mismo** `renderText` del export: si se previsualizara
 * con CSS, el archivo saldría distinto de lo que se vio y no habría forma de saberlo
 * hasta descargarlo.
 */
export function TypographyPanel() {
	const t = useT();
	const { limits, entitlements, authenticated, refresh } = useLimits();
	const plan = usePlanGate();
	const [draft, setDraft] = useLocalDraft<Draft>("tipografias.draft", DEFAULT_DRAFT);
	const [preview, setPreview] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	// El catálogo entero se muestra siempre: las familias del plan superior salen en
	// gris y explican por qué. Ocultarlas dejaba una lista corta sin motivo aparente.
	const available = useMemo(() => new Set(fontsFor(limits.fonts).map((f) => f.id)), [limits.fonts]);
	const catalog = allFonts();
	const lockedFonts = catalog.length - available.size;
	const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });

	const options = useCallback(
		(longEdge: number, watermark: boolean): TextRenderOptions => ({
			...DEFAULT_RENDER,
			text: draft.text,
			fontId: draft.fontId,
			color: draft.color,
			background: draft.background,
			transparent: draft.transparent && supportsTransparency(draft.format),
			longEdge,
			watermark: watermark ? WATERMARK : undefined,
		}),
		[draft]
	);

	// Preview diferido: redibujar en cada tecla en una fuente recién cargada trabaría
	// el tipeo en un teléfono.
	useEffect(() => {
		let alive = true;
		const timer = setTimeout(() => {
			void renderText(options(PREVIEW_EDGE, !authenticated))
				.then((canvas) => alive && setPreview(canvas.toDataURL("image/png")))
				.catch(() => alive && setPreview(null));
		}, 220);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [options, authenticated]);

	const download = async () => {
		setError(null);
		setBusy(true);
		try {
			const request: ExportRequest = { format: draft.format, longEdge: draft.longEdge, transparent: draft.transparent };

			if (authenticated) {
				// El servidor es la autoridad: valida y descuenta ANTES de rasterizar, así
				// nadie espera un render que después se rechaza.
				const result = await generatorsApi.recordExport(request);
				if (!result.ok) {
					const key = result.errorKey ?? "";
					setError(
						key in ERROR_FALLBACKS
							? t(`errors.${key}`, undefined, ERROR_FALLBACKS[key])
							: t("errors.generic", undefined, "No se pudo exportar. Probá de nuevo en un momento.")
					);
					return;
				}
				refresh();
			} else if (!canExportAt(GENERATORS_FREE_LIMITS, request)) {
				// Anónimo: no hay a quién descontarle sin identificarlo por IP, así que el
				// piso gratuito se aplica acá y el archivo sale con marca.
				setError(t("errors.anonymousLimit", undefined, "Iniciá sesión para exportar en esta resolución o con fondo transparente."));
				return;
			}

			const canvas = await renderText(options(draft.longEdge, !authenticated));
			const blob = await canvasToBlob(canvas, draft.format);
			downloadBlob(blob, safeFileName(draft.text, FORMATS.find((f) => f.value === draft.format)!.ext));
		} catch {
			setError(t("errors.render", undefined, "No se pudo generar la imagen en este navegador."));
		} finally {
			setBusy(false);
		}
	};

	const maxEdge = authenticated ? limits.maxExportLongEdge : GENERATORS_FREE_LIMITS.maxExportLongEdge;
	const canBeTransparent = authenticated ? limits.transparency : GENERATORS_FREE_LIMITS.transparency;

	const pickSize = (size: number) => {
		if (size > maxEdge) {
			plan.ask(t("plan.resolution", { maxEdge: String(maxEdge) }, "Tu plan llega hasta {{maxEdge}} px."));
			return;
		}
		set("longEdge", size);
	};

	return (
		<GeneratorShell
			title="Texto con tipografías"
			description="Escribí con tipografías libres y descargá el resultado como imagen, con o sin fondo."
		>
			<div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
				<div>
					<label className="mb-3 block">
						<span className="mb-1 block font-text text-sm text-muted">{t("typography.textLabel", undefined, "Tu texto")}</span>
						<adc-textarea
							value={draft.text}
							rows={3}
							aria-label="Texto a componer"
							onInput={(e: React.FormEvent) => set("text", (e.target as HTMLTextAreaElement).value)}
						/>
					</label>

					<div
						className="flex min-h-56 items-center justify-center rounded-md border border-text/10 bg-[repeating-conic-gradient(#0002_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-3"
						aria-live="polite"
					>
						{preview ? (
							<img src={preview} alt={`Vista previa: ${draft.text}`} className="max-h-72 max-w-full object-contain" />
						) : (
							<adc-skeleton variant="rectangular" height="180px" />
						)}
					</div>

					{!authenticated && (
						<p className="mt-2 font-text text-[11px] text-muted">
							{t("typography.anonymousNotice", { maxEdge: String(GENERATORS_FREE_LIMITS.maxExportLongEdge) }, "Sin iniciar sesión la imagen sale con una marca al pie y hasta {{maxEdge}} px.")}
						</p>
					)}
				</div>

				<aside className="space-y-4 self-start lg:sticky lg:top-20">
					<adc-color-picker
						label={t("typography.colorLabel", undefined, "Color del texto")}
						value={draft.color}
						onadcChange={(e: Event) => set("color", (e as CustomEvent<string>).detail)}
					/>
					<adc-color-picker
						label={t("typography.backgroundLabel", undefined, "Fondo")}
						value={draft.background}
						disabled={draft.transparent}
						onadcChange={(e: Event) => set("background", (e as CustomEvent<string>).detail)}
					/>

					<div className="flex items-center gap-2">
						<adc-toggle
							checked={draft.transparent && canBeTransparent}
							label={t("typography.transparentLabel", undefined, "Fondo transparente")}
							size="small"
							disabled={!canBeTransparent || !supportsTransparency(draft.format)}
							onadcChange={(e: Event) => set("transparent", (e as CustomEvent<boolean>).detail)}
						/>
						{!canBeTransparent && (
							<LockChip onClick={() => plan.ask(t("plan.transparency", undefined, "El fondo transparente viene con los planes pagos."))} />
						)}
					</div>
					{canBeTransparent && !supportsTransparency(draft.format) && (
						<p className="-mt-2 font-text text-[11px] text-muted">{t("typography.noAlpha", undefined, "JPG no tiene canal alfa: elegí PNG o WEBP.")}</p>
					)}

					<label className="block">
						<span className="mb-1 block font-text text-sm text-muted">{t("typography.formatLabel", undefined, "Formato")}</span>
						{/* `adc-select` y no `adc-segmented`: el segmentado dibuja botones cuadrados de
						    tamaño fijo pensados para iconos, y con rótulos de texto los recorta. */}
						<adc-select
							value={draft.format}
							options={JSON.stringify(FORMATS.map((f) => ({ value: f.value, label: f.label })))}
							onadcChange={(e: Event) => set("format", (e as CustomEvent<string>).detail as ExportFormat)}
						/>
					</label>

					<div>
						<span className="mb-1 block font-text text-sm text-muted">{t("typography.sizeLabel", undefined, "Tamaño (lado más largo)")}</span>
						{/* Botones y no un desplegable: el candado tiene que verse sin abrir la lista,
						    y tocar un escalón bloqueado es lo que abre la explicación. */}
						<div className="flex flex-wrap gap-2">
							{SIZES.map((size) => {
								const locked = size > maxEdge;
								return (
									<button
										key={size}
										type="button"
										aria-pressed={draft.longEdge === size}
										onClick={() => pickSize(size)}
										className={`rounded-full border px-3 py-1 font-text text-sm transition-colors ${
											draft.longEdge === size ? "border-primary bg-primary text-tprimary" : "border-text/15 text-text hover:border-accent"
										} ${locked ? "opacity-45" : ""}`}
									>
										{size} px {locked && <span aria-hidden="true">🔒</span>}
									</button>
								);
							})}
						</div>
					</div>

					<adc-button
						variant="primary"
						class="block"
						label={busy ? t("actions.generating", undefined, "Generando…") : t("actions.downloadImage", undefined, "Descargar imagen")}
						loading={busy}
						disabled={busy || !draft.text.trim()}
						onClick={() => void download()}
					/>

					{/* La cuota ya venía en el endpoint pero no se mostraba: enterarse del tope
					    recién cuando el export falla es la peor forma de enterarse. */}
					{entitlements && !isUnlimited(entitlements.limits.exportsPerDay) && (
						<p className="font-text text-[11px] text-muted">
							{t(
								"typography.quotaLeft",
								{
									day: String(remaining(entitlements.limits.exportsPerDay, entitlements.usage.export.day)),
									month: String(remaining(entitlements.limits.exportsPerMonth, entitlements.usage.export.month)),
								},
								"Te quedan {{day}} exportaciones hoy y {{month}} este mes."
							)}
						</p>
					)}

					{error && (
						<adc-callout tone="error" role="alert" class="block">
							<p className="text-sm">{error}</p>
						</adc-callout>
					)}

					<p className="font-text text-[11px] text-muted">
						{t(
							"typography.licenseNotice",
							undefined,
							"Las tipografías son de uso libre (SIL OFL). El texto que compongas es tuyo; sus licencias están en"
						)}{" "}
						{/* `label` y no children: React reinserta el nodo de texto tras el re-render del
						    chip y el rótulo sale duplicado (misma trampa que `adc-button`). */}
						<adc-platform-link href="https://help.adigitalcafe.com/licenses" label="avisos de licencia" />.
					</p>
				</aside>
			</div>

			<h2 className="mt-6 mb-2 font-heading text-lg text-text">{t("typography.fontLabel", undefined, "Tipografía")}</h2>
			{/* Cada familia se muestra escrita en sí misma: elegir una tipografía por su
			    nombre en una lista desplegable es elegir a ciegas. */}
			<ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
				{catalog.map((font) => {
					const locked = !available.has(font.id);
					const chosen = font.id === draft.fontId;
					return (
						<li key={font.id}>
							<button
								type="button"
								aria-pressed={chosen}
								onClick={() =>
									locked
										? plan.ask(t("plan.fonts", { count: String(lockedFonts) }, "Hay {{count}} tipografías más en los planes pagos."))
										: set("fontId", font.id)
								}
								className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
									chosen ? "border-accent bg-surface" : "border-text/10 hover:border-accent"
								} ${locked ? "opacity-45" : ""}`}
							>
								<span className="min-w-0">
									<span className="block truncate text-base text-text" style={{ fontFamily: fontStack(font.id) }}>
										{font.label}
									</span>
									<span className="block font-text text-[11px] text-muted">{font.category}</span>
								</span>
								{locked && <span aria-hidden="true">🔒</span>}
							</button>
						</li>
					);
				})}
			</ul>
			{plan.dialog}
		</GeneratorShell>
	);
}
