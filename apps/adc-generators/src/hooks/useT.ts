import { useTranslation } from "@ui-library/utils/i18n-react";

/**
 * `t` de la app con su namespace ya puesto.
 *
 * Todas las llamadas pasan el texto en español como **fallback**: así la página se
 * ve bien desde el primer frame, antes de que el namespace termine de cargar, y no
 * parpadea con las claves crudas — que en páginas de tráfico frío es la diferencia
 * entre quedarse y volver atrás.
 */
export function useT(): (key: string, params?: Record<string, string>, fallback?: string) => string {
	return useTranslation({ namespace: "adc-generators", autoLoad: true }).t;
}
