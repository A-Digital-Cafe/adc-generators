import { RegisterEndpoint, type EndpointCtx } from "@services/core/EndpointManagerService/index.js";
import { GeneratorsError } from "@common/types/custom-errors/GeneratorsError.ts";
import { canExportAt, type EntitlementsDTO, type ExportFormat, type ExportRequest, type UsageSnapshot } from "@common/types/generators/index.ts";
import type GeneratorsService from "../index.js";

const VALID_FORMATS: ReadonlySet<ExportFormat> = new Set(["png", "jpg", "webp"]);

export class EntitlementsEndpoints {
	static #service: GeneratorsService;

	static init(service: GeneratorsService, _kernelKey: symbol): void {
		EntitlementsEndpoints.#service ??= service;
	}

	/**
	 * Exige sesión. Es la decisión que evita medir a los anónimos por IP —dato
	 * personal, tratamiento nuevo, alta en el RAT—: sin sesión rige el piso
	 * `GENERATORS_FREE_LIMITS`, aplicado en el cliente.
	 */
	static #requireUser(ctx: EndpointCtx): string {
		const id = ctx.user?.id;
		if (!id) throw new GeneratorsError(401, "NOT_AUTHENTICATED", "Sesión requerida");
		return id;
	}

	/** Tier + límites + consumo actual del usuario. Fuente única para la UI. */
	@RegisterEndpoint({
		method: "GET",
		url: "/api/generators/me/limits",
		deferAuth: true,
		options: { tag: "Generators/Entitlements", summary: "Entitlements del usuario (tier, límites y uso)" },
	})
	static async myLimits(ctx: EndpointCtx): Promise<EntitlementsDTO> {
		const userId = EntitlementsEndpoints.#requireUser(ctx);
		return EntitlementsEndpoints.#service.entitlements.forUser(userId);
	}

	/**
	 * Registra una exportación: valida formato, resolución y transparencia contra el
	 * tier y descuenta la cuota (día + mes).
	 *
	 * Es el único gate server-authoritative de la app. Se llama **antes** de que el
	 * cliente rasterice: rechazar después del render dejaría al usuario esperando
	 * para nada, y validar en el cliente no es validar.
	 */
	@RegisterEndpoint({
		method: "POST",
		url: "/api/generators/usage/export",
		deferAuth: true,
		options: {
			rateLimit: { max: 60, timeWindow: 60_000 },
			tag: "Generators/Entitlements",
			summary: "Registra y valida una exportación",
		},
	})
	static async recordExport(ctx: EndpointCtx<Record<string, string>, Partial<ExportRequest>>): Promise<{ ok: true; usage: UsageSnapshot }> {
		const userId = EntitlementsEndpoints.#requireUser(ctx);
		const { format, longEdge, transparent } = ctx.data ?? {};
		if (!format || !VALID_FORMATS.has(format) || typeof longEdge !== "number" || !Number.isFinite(longEdge) || longEdge <= 0) {
			throw new GeneratorsError(400, "MISSING_FIELDS", "`format` (png|jpg|webp) y `longEdge` (px) requeridos");
		}

		const service = EntitlementsEndpoints.#service;
		const limits = await service.tiers.userLimits(userId);
		const request: ExportRequest = { format, longEdge, transparent: transparent === true };

		if (!canExportAt(limits, request)) {
			// Dos motivos distintos con el mismo `canExportAt`: distinguirlos acá es lo
			// que permite que la UI diga "subí de plan" o "ese formato no tiene alfa".
			if (request.transparent && format === "jpg") {
				throw new GeneratorsError(400, "UNSUPPORTED_FORMAT", "JPG no tiene canal alfa");
			}
			if (request.transparent && !limits.transparency) {
				throw new GeneratorsError(403, "TRANSPARENCY_NOT_ALLOWED", "El fondo transparente no está incluido en tu plan", {
					transparency: limits.transparency,
				});
			}
			throw new GeneratorsError(403, "RESOLUTION_TOO_HIGH", "Resolución no permitida en tu plan", {
				maxLongEdge: limits.maxExportLongEdge,
			});
		}

		const snapshot = await service.usage.snapshot(userId);
		const check = service.usage.check("export", limits, snapshot);
		if (!check.allowed) {
			throw new GeneratorsError(403, check.errorKey ?? "QUOTA_EXCEEDED", "Alcanzaste el límite de exportaciones de tu plan", {
				exportsPerDay: limits.exportsPerDay,
				exportsPerMonth: limits.exportsPerMonth,
			});
		}

		await service.usage.commit(userId, "export");
		return { ok: true, usage: await service.usage.snapshot(userId) };
	}
}
