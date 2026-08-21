import type { Model } from "mongoose";
import type { UsageCounterDoc, UsageWindow } from "../domain/usageCounter.ts";
import { isUnlimited, type GeneratorsLimits, type GeneratorsMetric, type UsageSnapshot } from "@common/types/generators/index.ts";

/** Logger estructural (satisfecho por el logger de las clases base). */
interface Logger {
	logError(msg: string): void;
}

const METRICS: readonly GeneratorsMetric[] = ["export"];

function limitsFor(metric: GeneratorsMetric, limits: GeneratorsLimits): { day: number; month: number } {
	switch (metric) {
		case "export":
			return { day: limits.exportsPerDay, month: limits.exportsPerMonth };
	}
}

function periodKey(window: UsageWindow, now = new Date()): string {
	const iso = now.toISOString();
	return window === "day" ? iso.slice(0, 10) : iso.slice(0, 7); // YYYY-MM-DD | YYYY-MM
}

function counterId(userId: string, metric: GeneratorsMetric, window: UsageWindow, period: string): string {
	return `${userId}|${metric}|${window}|${period}`;
}

/**
 * Medición de uso con ventana día/mes. Atómica vía `findOneAndUpdate` con upsert;
 * el reset es implícito al rotar el `period`.
 *
 * Vive en este servicio y no en `PlanService` por lo mismo que en el editor: los
 * límites se pueden degradar durante una caída, lo ya gastado no se puede perder.
 */
export class UsageManager {
	readonly #model: Model<UsageCounterDoc>;
	readonly #logger: Logger;

	constructor(model: Model<UsageCounterDoc>, logger: Logger) {
		this.#model = model;
		this.#logger = logger;
	}

	/** Consumo actual (día y mes) de todas las métricas para el usuario. */
	async snapshot(userId: string): Promise<UsageSnapshot> {
		const day = periodKey("day");
		const month = periodKey("month");
		const ids = METRICS.flatMap((m) => [counterId(userId, m, "day", day), counterId(userId, m, "month", month)]);
		const docs = await this.#model.find({ _id: { $in: ids } }).lean();
		const byId = new Map(docs.map((d) => [d._id, d.count]));
		const snap = {} as UsageSnapshot;
		for (const m of METRICS) {
			snap[m] = {
				day: byId.get(counterId(userId, m, "day", day)) ?? 0,
				month: byId.get(counterId(userId, m, "month", month)) ?? 0,
			};
		}
		return snap;
	}

	/** `allowed: false` con `errorKey` cuando consumir una unidad pasaría el límite. */
	check(
		metric: GeneratorsMetric,
		limits: GeneratorsLimits,
		snapshot: UsageSnapshot
	): { allowed: boolean; errorKey?: "QUOTA_EXCEEDED" | "DAILY_QUOTA_EXCEEDED" } {
		const cap = limitsFor(metric, limits);
		const used = snapshot[metric];
		if (!isUnlimited(cap.day) && used.day >= cap.day) return { allowed: false, errorKey: "DAILY_QUOTA_EXCEEDED" };
		if (!isUnlimited(cap.month) && used.month >= cap.month) return { allowed: false, errorKey: "QUOTA_EXCEEDED" };
		return { allowed: true };
	}

	/** Incrementa atómicamente los contadores día y mes de `metric` en +1. */
	async commit(userId: string, metric: GeneratorsMetric): Promise<void> {
		const now = new Date();
		await Promise.all(
			(["day", "month"] as UsageWindow[]).map(async (window) => {
				const period = periodKey(window, now);
				try {
					await this.#model.findOneAndUpdate(
						{ _id: counterId(userId, metric, window, period) },
						{ $inc: { count: 1 }, $set: { userId, metric, window, period, updatedAt: now } },
						{ upsert: true }
					);
				} catch (e: unknown) {
					this.#logger.logError(`UsageManager.commit ${metric}/${window}: ${String(e)}`);
				}
			})
		);
	}
}
