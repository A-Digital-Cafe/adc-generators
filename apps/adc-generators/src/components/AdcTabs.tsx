import { useEffect, useRef } from "react";

export interface AdcTab {
	id: string;
	label: string;
}

/**
 * Envoltorio de `adc-tabs` (UI library) con el patrón ref + addEventListener que
 * usan las demás apps: el custom element emite `adcTabChange` con el id.
 */
export function AdcTabs({
	tabs,
	activeId,
	onChange,
}: {
	readonly tabs: readonly AdcTab[];
	readonly activeId: string;
	readonly onChange: (id: string) => void;
}) {
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const handler = (e: Event) => onChange((e as CustomEvent<string>).detail);
		el.addEventListener("adcTabChange", handler);
		return () => el.removeEventListener("adcTabChange", handler);
	}, [onChange]);
	return <adc-tabs ref={ref} tabs={JSON.stringify(tabs)} activeTab={activeId} variant="underline" />;
}
