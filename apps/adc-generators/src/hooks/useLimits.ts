import { useEffect, useState } from "react";
import { GENERATORS_FREE_LIMITS, type EntitlementsDTO, type GeneratorsLimits } from "@common/types/generators/index.ts";
import { generatorsApi } from "../api/generators-api.ts";

export interface LimitsState {
	/** Límites efectivos. Sin sesión, el piso gratuito. */
	limits: GeneratorsLimits;
	entitlements: EntitlementsDTO | null;
	/** `false` mientras no se sabe: sirve para no parpadear el candado. */
	authenticated: boolean;
	loading: boolean;
	refresh: () => void;
}

/**
 * Límites del usuario para el feedback de la UI.
 *
 * Sin sesión el endpoint devuelve 401 y acá se cae al piso gratuito, que es
 * exactamente lo que ve un anónimo. **Esto no es el control**: el gate real está en
 * `POST /api/generators/usage/export`, y todo lo que se decide acá es si un botón
 * se ve bloqueado.
 */
export function useLimits(): LimitsState {
	const [entitlements, setEntitlements] = useState<EntitlementsDTO | null>(null);
	const [loading, setLoading] = useState(true);
	const [nonce, setNonce] = useState(0);

	useEffect(() => {
		let alive = true;
		setLoading(true);
		generatorsApi
			.getLimits()
			.then((dto) => alive && setEntitlements(dto))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [nonce]);

	return {
		limits: entitlements?.limits ?? GENERATORS_FREE_LIMITS,
		entitlements,
		authenticated: entitlements !== null,
		loading,
		refresh: () => setNonce((n) => n + 1),
	};
}
