import type { EntitlementsDTO } from "@common/types/generators/index.ts";
import type { GeneratorsTierResolver } from "../utils/tier-resolver.ts";
import type { UsageManager } from "./UsageManager.ts";

/**
 * Tier + límites efectivos + consumo actual. Fuente única para el feedback de la UI.
 *
 * Los límites salen del resolver (que los pide a `PlanService`), **no** del piso
 * `GENERATORS_FREE_LIMITS`: leerlo directo acá ignoraría las ediciones de plan y
 * los overrides por usuario.
 */
export class EntitlementsManager {
	readonly #tiers: GeneratorsTierResolver;
	readonly #usage: UsageManager;

	constructor(tiers: GeneratorsTierResolver, usage: UsageManager) {
		this.#tiers = tiers;
		this.#usage = usage;
	}

	async forUser(userId: string): Promise<EntitlementsDTO> {
		const [tier, limits, usage] = await Promise.all([
			this.#tiers.userTier(userId),
			this.#tiers.userLimits(userId),
			this.#usage.snapshot(userId),
		]);
		return { tier, limits, usage };
	}
}
