import { useMemo } from "react";
import { LETTER_STYLES } from "../../../catalog.ts";
import { applyStyle } from "../letters.ts";
import { CopyField } from "../../components/CopyField.tsx";
import { GeneratorShell } from "../../components/GeneratorShell.tsx";
import { useLocalDraft } from "../../hooks/useLocalDraft.ts";
import { useT } from "../../hooks/useT.ts";


/**
 * Conversor de letras. Sin botón "Generar": el resultado se recalcula mientras se
 * escribe, que es la mitad de por qué la gente vuelve a estas páginas.
 *
 * Cuando la ruta trae un estilo, ese sale **en su propia tarjeta destacada** y el
 * resto queda abajo como descubrimiento; ponerlo primero dentro de la misma lista
 * no se notaba. Los rótulos de los demás enlazan a **su propia URL**: son las
 * páginas que se indexan y las que la gente comparte.
 */
export function LettersPanel({ styleSlug }: { readonly styleSlug?: string }) {
	const t = useT();
	const placeholder = t("letters.placeholder", undefined, "Escribí algo");
	const [text, setText] = useLocalDraft("letras.text", "");
	const active = LETTER_STYLES.find((s) => s.slug === styleSlug);
	const rest = useMemo(() => LETTER_STYLES.filter((s) => s.slug !== styleSlug), [styleSlug]);
	const source = text || placeholder;

	return (
		<GeneratorShell
			title={active ? `Letras ${active.label.toLocaleLowerCase("es")}` : "Conversor de letras"}
			description={active?.description ?? "Convertí tu texto a caracteres Unicode decorativos y copialos donde quieras."}
		>
			<label className="mb-4 block">
				<span className="mb-1 block font-text text-sm text-muted">{t("letters.inputLabel", undefined, "Tu texto")}</span>
				<adc-textarea
					value={text}
					rows={3}
					placeholder={placeholder}
					aria-label="Texto a convertir"
					onInput={(e: React.FormEvent) => setText((e.target as HTMLTextAreaElement).value)}
				/>
			</label>

			{active && (
				<section className="mb-5 rounded-md border-2 border-accent bg-surface p-4" aria-label={t("letters.chosenStyle", undefined, "Estilo elegido")}>
					<span className="mb-1 block font-text text-[11px] uppercase tracking-wide text-accent">
						{t("letters.chosenStyle", undefined, "Estilo elegido")}
					</span>
					<CopyField label={active.label} value={applyStyle(active.slug, source)} big />
				</section>
			)}

			<h2 className="mb-2 font-heading text-lg text-text">
				{active ? t("letters.otherStyles", undefined, "Otros estilos") : t("letters.allStyles", undefined, "Todos los estilos")}
			</h2>
			{/* Dos columnas en pantalla ancha: trece resultados en una sola columna obligan
			    a scrollear para comparar dos estilos. */}
			<adc-card class="block p-4 lg:grid lg:grid-cols-2 lg:gap-x-6">
				{rest.map((style) => (
					<CopyField key={style.slug} label={style.label} value={applyStyle(style.slug, source)} href={`/letras/${style.slug}`} big />
				))}
			</adc-card>

			{/* La advertencia va al pie y no arriba: es importante, pero empujaba la
			    herramienta fuera de la primera pantalla. */}
			<adc-callout tone="info" role="note" class="mt-5 block">
				<p className="text-sm">
					{t(
						"letters.accessibility",
						undefined,
						"Esto no cambia la tipografía: reemplaza cada letra por otro carácter Unicode. Por eso se puede pegar donde no hay formato, como una biografía o un nombre de usuario. También por eso los lectores de pantalla lo leen mal y algunos dispositivos muestran recuadros vacíos: conviene usarlo en adornos, no en el texto que alguien necesita leer."
					)}
				</p>
			</adc-callout>
		</GeneratorShell>
	);
}
