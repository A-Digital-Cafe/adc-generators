/**
 * Descarga local de lo generado. Mismo patrón que el resto de la plataforma
 * (`document-formats.ts` de la media library, `ExportDialog` del editor): blob →
 * object URL → ancla sintética → revoke.
 */

export function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	// Revocar en el mismo turno cancela la descarga en algunos navegadores.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(content: string, fileName: string, mime: string): void {
	downloadBlob(new Blob([content], { type: `${mime};charset=utf-8` }), fileName);
}

/** Copia al portapapeles con el fallback para contextos sin permiso. */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// `execCommand` está obsoleto pero es el único camino sin permiso concedido,
		// que es el caso normal en iOS dentro de un iframe.
		const area = document.createElement("textarea");
		area.value = text;
		area.setAttribute("readonly", "");
		area.style.position = "fixed";
		area.style.opacity = "0";
		document.body.appendChild(area);
		area.select();
		const ok = document.execCommand?.("copy") ?? false;
		area.remove();
		return ok;
	}
}

/** Nombre de archivo seguro derivado del texto que generó el resultado. */
export function safeFileName(base: string, extension: string): string {
	const clean =
		base
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.replace(/[^\p{L}\p{N}]+/gu, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 40)
			.toLowerCase() || "adc";
	return `${clean}.${extension}`;
}
