/**
 * Límites efectivos de los generadores.
 *
 * No resuelve el tier: eso es de `PlanService`, el único resolver de la plataforma.
 * Acá sólo se traducen las features del catálogo a `GeneratorsLimits`, que es la
 * forma que ya consumen la UI y el `UsageManager`.
 *
 * **Degradación**: sin `PlanService`, límites del tier `free`. Misma convención que
 * el resto de la plataforma: fallar hacia el piso, no hacia el techo.
 */

import type { AccountTier } from "@common/types/tiers.ts";
import type { EntitlementsGetter, FeatureValue, PlanSubject } from "@common/types/plans/index.ts";
import { GENERATORS_FREE_LIMITS, type FontLibraryTier, type GeneratorsLimits } from "@common/types/generators/index.ts";
import { createEntitlementsReader, featureNumber as num, featureString as str } from "@common/types/plans/consumers.ts";

export interface GeneratorsTierResolver {
	userTier(userId: string): Promise<AccountTier>;
	userLimits(userId: string): Promise<GeneratorsLimits>;
}

const FALLBACK_TIER: AccountTier = "free";
const FALLBACK = GENERATORS_FREE_LIMITS;

/** Un flag ausente o no booleano vale lo que valga en el piso gratuito. */
const flag = (value: FeatureValue | undefined, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

export function createGeneratorsTierResolver(getEntitlements: EntitlementsGetter): GeneratorsTierResolver {
	const readEntitlements = createEntitlementsReader(getEntitlements);
	const resolve = async (subject: PlanSubject): Promise<{ tier: AccountTier; features: Record<string, FeatureValue> | null }> => {
		const dto = await readEntitlements(subject);
		return { tier: (dto?.tier as AccountTier) ?? FALLBACK_TIER, features: dto?.features ?? null };
	};

	return {
		async userTier(userId) {
			return (await resolve({ userId, orgId: null })).tier;
		},
		async userLimits(userId) {
			const { features } = await resolve({ userId, orgId: null });
			if (!features) return FALLBACK;
			return {
				exportsPerMonth: num(features["generators.exportsPerMonth"], FALLBACK.exportsPerMonth),
				exportsPerDay: num(features["generators.exportsPerDay"], FALLBACK.exportsPerDay),
				maxExportLongEdge: num(features["generators.maxExportLongEdge"], FALLBACK.maxExportLongEdge),
				fonts: str<FontLibraryTier>(features["generators.fonts"], FALLBACK.fonts),
				transparency: flag(features["generators.transparency"], FALLBACK.transparency),
				tokenExport: flag(features["generators.tokenExport"], FALLBACK.tokenExport),
				batch: flag(features["generators.batch"], FALLBACK.batch),
				brandKits: flag(features["generators.brandKits"], FALLBACK.brandKits),
			};
		},
	};
}
