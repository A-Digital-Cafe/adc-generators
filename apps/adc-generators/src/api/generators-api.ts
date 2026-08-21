/**
 * Cliente de `GeneratorsService`: entitlements y registro de exportación.
 *
 * Sólo hay dos llamadas porque sólo hay una acción gateada. Todo lo demás
 * —convertir texto, generar paletas, medir contraste— ocurre en el navegador y no
 * tiene endpoint que llamar.
 */

import { createAdcApi } from "@ui-library/utils/adc-fetch";
import type { EntitlementsDTO, ExportRequest, UsageSnapshot } from "@common/types/generators/index.ts";

const api = createAdcApi({ basePath: "/api/generators", devPort: 3000 });

export const generatorsApi = {
	/** Tier + límites + uso. `null` si no hay sesión: ahí rige el piso `free`. */
	getLimits: async (): Promise<EntitlementsDTO | null> => {
		const r = await api.get<EntitlementsDTO>("/me/limits", { silent: true });
		return r.data ?? null;
	},

	/**
	 * Valida formato/resolución/transparencia y descuenta una exportación.
	 *
	 * Se llama **antes** de producir el blob: si el plan no da, no tiene sentido
	 * gastar el render, y el usuario ve el motivo en vez de un archivo recortado.
	 */
	recordExport: async (request: ExportRequest): Promise<{ ok: boolean; usage?: UsageSnapshot; errorKey?: string }> => {
		const r = await api.post<{ ok: true; usage: UsageSnapshot }>("/usage/export", {
			body: request,
			idempotencyData: { action: "export", ...request, t: Date.now() },
			silent: true,
		});
		return { ok: !!r.data?.ok, usage: r.data?.usage, errorKey: r.errorKey };
	},
};
