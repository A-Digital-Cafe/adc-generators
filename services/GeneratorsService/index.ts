import type MongoProvider from "@providers/object/mongo/index.js";
import { BaseService } from "@services/BaseService.js";
import { Kernel } from "@kernel";
import { EnableEndpoints, DisableEndpoints } from "@services/core/EndpointManagerService/index.js";
import { createEntitlementsGetter, registerPlanFeatures } from "@common/types/plans/consumers.js";
import type { IPlanService } from "@common/types/plans/IPlanService.js";
import { GeneratorsError } from "@common/types/custom-errors/GeneratorsError.ts";
import { usageCounterSchema, type UsageCounterDoc } from "./domain/index.ts";
import { UsageManager, EntitlementsManager } from "./dao/index.ts";
import { createGeneratorsTierResolver, type GeneratorsTierResolver } from "./utils/tier-resolver.ts";
import { GENERATORS_PLAN_FEATURES, GENERATORS_PLAN_DEFAULTS } from "./utils/plan-features.ts";
import { EntitlementsEndpoints } from "./endpoints/index.ts";

/**
 * GeneratorsService: entitlements por plan (vía `PlanService`, piso en
 * `@common/types/generators`) y medición de uso de exportaciones con ventana
 * día/mes en MongoDB.
 *
 * Es un servicio deliberadamente chico: la app genera todo en el navegador y sólo
 * consulta acá para exportar. Si mañana un generador necesitara servidor, ese sería
 * el momento de revisar el encuadre de privacidad, no antes.
 */
export default class GeneratorsService extends BaseService {
	public readonly name = "GeneratorsService";

	#usage: UsageManager | null = null;
	#entitlements: EntitlementsManager | null = null;
	#tiers: GeneratorsTierResolver | null = null;

	private mongoProvider!: MongoProvider;

	constructor(kernel: Kernel, options?: ConstructorParameters<typeof BaseService>[1]) {
		super(kernel, options);
	}

	public override onDependencyRestored(dependencyName: string): void {
		if (dependencyName === "PlanService") this.#registerPlanFeatures();
	}

	/** Declara las features de los generadores y sus defaults en el motor de planes (fail-open). */
	#registerPlanFeatures(): void {
		void registerPlanFeatures(
			() => this.tryGetMyService<IPlanService>("PlanService"),
			this.getCapability(),
			GENERATORS_PLAN_FEATURES,
			GENERATORS_PLAN_DEFAULTS
		);
	}

	@EnableEndpoints({ managers: () => [EntitlementsEndpoints] })
	async start(kernelKey: symbol): Promise<void> {
		await super.start(kernelKey);

		this.mongoProvider = this.getMyProvider<MongoProvider>("object/mongo");
		await this.waitForMongo();

		this.#tiers = createGeneratorsTierResolver(createEntitlementsGetter(() => this.tryGetMyService<IPlanService>("PlanService")));
		this.#registerPlanFeatures();

		const UsageModel = this.mongoProvider.createModel<UsageCounterDoc>("generators_usage", usageCounterSchema);
		this.#usage = new UsageManager(UsageModel, this.logger);
		this.#entitlements = new EntitlementsManager(this.#tiers, this.#usage);

		EntitlementsEndpoints.init(this, kernelKey);

		this.logger.logOk("GeneratorsService iniciado");
	}

	@DisableEndpoints()
	async stop(kernelKey: symbol): Promise<void> {
		await super.stop(kernelKey);
		this.#usage = null;
		this.#entitlements = null;
		this.#tiers = null;
	}

	private async waitForMongo(): Promise<void> {
		const maxWaitTime = 10000;
		const startTime = Date.now();
		while (!this.mongoProvider.isConnected() && Date.now() - startTime < maxWaitTime) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		if (!this.mongoProvider.isConnected()) throw new Error("MongoDB no pudo conectarse en el tiempo esperado");
	}

	get usage(): UsageManager {
		if (!this.#usage) throw new GeneratorsError(503, "GENERATORS_UNAVAILABLE", "UsageManager no inicializado");
		return this.#usage;
	}

	get entitlements(): EntitlementsManager {
		if (!this.#entitlements) throw new GeneratorsError(503, "GENERATORS_UNAVAILABLE", "EntitlementsManager no inicializado");
		return this.#entitlements;
	}

	get tiers(): GeneratorsTierResolver {
		if (!this.#tiers) throw new GeneratorsError(503, "GENERATORS_UNAVAILABLE", "TierResolver no inicializado");
		return this.#tiers;
	}
}
