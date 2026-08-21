import { useCallback, useEffect, useState } from "react";
import { copyToClipboard } from "../export/download.ts";
import { useT } from "../hooks/useT.ts";

/**
 * Resultado con botón de copiar. Es la acción primaria de toda la app: la mitad
 * del valor de un conversor es que copiar sea un gesto y no un flujo.
 *
 * El texto va en un `<output>` seleccionable y no en un input de sólo lectura para
 * que un lector de pantalla lo anuncie como resultado y no como campo editable.
 */
export function CopyField({
	label,
	value,
	href,
	monospace = false,
	showValue = true,
	big = false,
}: {
	readonly label: string;
	readonly value: string;
	/** Si se pasa, el rótulo enlaza a la página propia de este resultado. */
	readonly href?: string;
	readonly monospace?: boolean;
	/** `false` cuando el resultado ya se ve entero abajo y repetirlo truncado sobra. */
	readonly showValue?: boolean;
	/** Resultado en cuerpo grande: los glifos Unicode decorativos se leen chicos. */
	readonly big?: boolean;
}) {
	const t = useT();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 1600);
		return () => clearTimeout(timer);
	}, [copied]);

	const copy = useCallback(() => {
		void copyToClipboard(value).then(setCopied);
	}, [value]);

	return (
		<div className="flex items-center gap-2 border-b border-text/10 py-2 last:border-b-0">
			<div className="min-w-0 flex-1">
				<span className="block font-text text-[11px] uppercase tracking-wide text-muted">
					{href ? (
						// Ancla y no `adc-platform-link`: ese chip resuelve la app destino y le
						// antepone su icono y su nombre, que acá sería el nombre de esta misma app
						// repetido veinticinco veces. El chip es para enlazar OTRO microfront.
						<a href={href} className="text-accent underline underline-offset-2 hover:no-underline">
							{label}
						</a>
					) : (
						label
					)}
				</span>
				{showValue && (
					<output className={`block truncate text-text ${big ? "text-2xl leading-relaxed" : "text-lg"} ${monospace ? "font-mono text-base" : ""}`}>
						{value || " "}
					</output>
				)}
			</div>
			<adc-button
				variant="accent-outlined"
				size="small"
				class="shrink-0"
				label={copied ? t("actions.copied", undefined, "¡Copiado!") : t("actions.copy", undefined, "Copiar")}
				disabled={!value}
				onClick={copy}
			/>
		</div>
	);
}
