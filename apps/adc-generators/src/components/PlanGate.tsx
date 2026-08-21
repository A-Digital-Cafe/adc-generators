import { useCallback, useState, type ReactNode } from "react";
import { getUrl } from "@common/utils/url-utils.js";
import { useT } from "../hooks/useT.ts";

const SUBSCRIPTIONS_PORT = 3042;
const SUBSCRIPTIONS_HOST = "planes.adigitalcafe.com";

/**
 * Explicación de qué plan habilita una opción.
 *
 * Va en un modal y no junto al control: el aviso completo repetido al lado de cada
 * cosa bloqueada convertía la página en una lista de candados. Lo que queda a la
 * vista es el control bloqueado —que se sigue viendo, porque una función que no se
 * sabe que existe no se contrata— y el candado que lo abre.
 */
function PlanDialog({ reason, onClose }: { readonly reason: string; readonly onClose: () => void }) {
	const t = useT();
	return (
		<adc-modal open modalTitle={t("plan.dialogTitle", undefined, "Esto viene con los planes pagos")} size="sm" onadcClose={onClose}>
			<p className="text-sm">{reason}</p>
			<p className="mt-3">
				{/* `label` y no children: React reinserta el texto tras el re-render del chip y
				    el rótulo sale duplicado (misma trampa que `adc-button`). */}
				<adc-platform-link href={getUrl(SUBSCRIPTIONS_PORT, SUBSCRIPTIONS_HOST, "/")} label={t("actions.seePlans", undefined, "Ver planes")} />
			</p>
		</adc-modal>
	);
}

export interface PlanGate {
	/** Abre el modal con el motivo dado. */
	ask: (reason: string) => void;
	/** Nodo a renderizar una sola vez en el panel. */
	dialog: ReactNode;
}

/** Un modal por panel, compartido por todos sus controles bloqueados. */
export function usePlanGate(): PlanGate {
	const [reason, setReason] = useState<string | null>(null);
	const ask = useCallback((next: string) => setReason(next), []);
	return {
		ask,
		dialog: reason === null ? null : <PlanDialog reason={reason} onClose={() => setReason(null)} />,
	};
}

/**
 * Candado suelto: para controles que no pueden llevar el clic ellos mismos (un
 * toggle deshabilitado no emite eventos). Donde el control sí puede, mejor que el
 * propio control abra el modal y no exista este chip.
 */
export function LockChip({ onClick, className = "" }: { readonly onClick: () => void; readonly className?: string }) {
	const t = useT();
	const label = t("plan.lockedLabel", undefined, "Incluido en los planes pagos");
	return (
		<button
			type="button"
			onClick={onClick}
			title={label}
			aria-label={label}
			className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-text/15 text-[10px] leading-none text-muted transition-colors hover:border-accent hover:text-accent ${className}`}
		>
			<span aria-hidden="true">🔒</span>
		</button>
	);
}
