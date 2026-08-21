/**
 * Features de plan que los generadores declaran en `PlanService` al arrancar
 * (`registerFeatures`, scope `plans:register`).
 *
 * ⚠️ Los tiers pagos son **defaults de DESARROLLO**: la oferta real se publica
 * sobre `PlanService` (`PUT /api/plans/admin/plans`), que congela los planes para
 * que estos defaults no los pisen. El único valor real acá es el piso `free`
 * (`GENERATORS_FREE_LIMITS`), que además es la experiencia anónima.
 *
 * Lo que **no** hay acá es una feature "cantidad de tipografías". El catálogo vive
 * en el bundle del cliente: gatearlo sería inaplicable, y una versión gratuita sin
 * tipografías no la enlaza nadie, que es de donde viene el tráfico. Se vende el
 * output —resolución, transparencia, lote, tokens, kits—, no el acceso.
 */

import type { FeatureDef, ModulePlanDefaults, PlanFeatureValue } from "@common/types/plans/index.ts";
import { GENERATORS_FREE_LIMITS, type GeneratorsLimits } from "@common/types/generators/index.ts";

export const GENERATORS_PLAN_FEATURES: FeatureDef[] = [
	{
		key: "generators.exportsPerMonth",
		module: "adc-generators",
		label: "plans.features.generators.exportsPerMonth",
		kind: "quota",
		unit: "count",
		window: "month",
		salesVisible: true,
	},
	{
		key: "generators.exportsPerDay",
		module: "adc-generators",
		label: "plans.features.generators.exportsPerDay",
		kind: "quota",
		unit: "count",
		window: "day",
	},
	{
		key: "generators.maxExportLongEdge",
		module: "adc-generators",
		label: "plans.features.generators.resolution",
		kind: "limit",
		unit: "px",
		salesVisible: true,
	},
	{
		key: "generators.fonts",
		module: "adc-generators",
		label: "plans.features.generators.fonts",
		kind: "enum",
		salesVisible: true,
	},
	{
		key: "generators.transparency",
		module: "adc-generators",
		label: "plans.features.generators.transparency",
		kind: "flag",
		salesVisible: true,
	},
	{
		key: "generators.tokenExport",
		module: "adc-generators",
		label: "plans.features.generators.tokenExport",
		kind: "flag",
		salesVisible: true,
	},
	{ key: "generators.batch", module: "adc-generators", label: "plans.features.generators.batch", kind: "flag", salesVisible: true },
	{ key: "generators.brandKits", module: "adc-generators", label: "plans.features.generators.brandKits", kind: "flag", salesVisible: true },
];

/** Traduce los límites tipados a claves de feature del catálogo. */
function features(limits: GeneratorsLimits): Record<string, PlanFeatureValue> {
	return {
		"generators.exportsPerMonth": limits.exportsPerMonth,
		"generators.exportsPerDay": limits.exportsPerDay,
		"generators.maxExportLongEdge": limits.maxExportLongEdge,
		"generators.fonts": limits.fonts,
		"generators.transparency": limits.transparency,
		"generators.tokenExport": limits.tokenExport,
		"generators.batch": limits.batch,
		"generators.brandKits": limits.brandKits,
	};
}

/** Los generadores son personales: no hay pool de organización que repartir. */
export const GENERATORS_PLAN_DEFAULTS: ModulePlanDefaults = {
	user: {
		free: features(GENERATORS_FREE_LIMITS),
		// `vip` se otorga por comunidad: sube la resolución y abre el catálogo, que es
		// lo que se pide para publicar. No abre kits ni lote, que son de trabajo.
		vip: features({
			exportsPerMonth: 100,
			exportsPerDay: 15,
			maxExportLongEdge: 1920,
			fonts: "full",
			transparency: true,
			tokenExport: false,
			batch: false,
			brandKits: false,
		}),
		pro: features({
			exportsPerMonth: 300,
			exportsPerDay: 40,
			maxExportLongEdge: 2560,
			fonts: "full",
			transparency: true,
			tokenExport: true,
			batch: true,
			brandKits: true,
		}),
		plus: features({
			exportsPerMonth: 1000,
			exportsPerDay: 120,
			maxExportLongEdge: 4096,
			fonts: "full",
			transparency: true,
			tokenExport: true,
			batch: true,
			brandKits: true,
		}),
	},
};
