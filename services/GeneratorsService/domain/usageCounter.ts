import { Schema } from "mongoose";
import type { GeneratorsMetric } from "@common/types/generators/index.ts";

/** Ventana de medición. Vive acá porque sólo la usa el contador. */
export type UsageWindow = "day" | "month";

/**
 * Contador de uso por usuario/métrica/ventana. Un documento por combinación
 * `(userId, metric, window, period)`; `period` es `YYYY-MM-DD` (día) o `YYYY-MM`
 * (mes). El reset es implícito: al cambiar el período se crea otro documento.
 */
export interface UsageCounterDoc {
	/** `${userId}|${metric}|${window}|${period}` — clave determinista. */
	_id: string;
	userId: string;
	metric: GeneratorsMetric;
	window: UsageWindow;
	period: string;
	count: number;
	updatedAt: Date;
}

export const usageCounterSchema = new Schema<UsageCounterDoc>(
	{
		_id: { type: String, required: true },
		userId: { type: String, required: true, index: true },
		metric: { type: String, required: true },
		window: { type: String, required: true },
		period: { type: String, required: true },
		count: { type: Number, required: true, default: 0 },
		updatedAt: { type: Date, required: true, default: () => new Date() },
	},
	{ _id: false, versionKey: false }
);
