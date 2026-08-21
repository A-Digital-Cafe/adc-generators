import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Prefijo declarado en `/cookies` § 4.3. Cambiarlo obliga a corregir ese documento:
 * lo que se guarda en el dispositivo está enumerado ahí, no acá.
 */
const PREFIX = "adc-generators:";

/**
 * Borradores montados. `clearDrafts()` los tiene que devolver a su valor inicial:
 * vaciar `localStorage` y dejar el estado de React intacto es indistinguible de no
 * haber hecho nada, que es exactamente cómo se veía antes.
 */
const mounted = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
	try {
		const raw = globalThis.localStorage?.getItem(PREFIX + key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		// Modo privado, cuota llena o JSON viejo de una versión anterior: se arranca limpio.
		return fallback;
	}
}

/**
 * Estado persistido en `localStorage` con escritura diferida.
 *
 * Es almacenamiento necesario para la funcionalidad que la persona pidió —no
 * perder lo que escribió al recargar—, no lleva identificador y no sale del
 * dispositivo. Por eso no necesita consentimiento previo, y por eso `clearDrafts()`
 * tiene que estar siempre a mano en la interfaz.
 */
export function useLocalDraft<T>(key: string, initial: T): [T, (value: T) => void] {
	const [value, setValue] = useState<T>(() => read(key, initial));
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Sólo se escribe después de un cambio de la persona: sin esto, montar el panel
	// vuelve a sembrar la clave que se acaba de borrar.
	const dirty = useRef(false);
	const fallback = useRef(initial);

	useEffect(() => {
		if (!dirty.current) return;
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			try {
				globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
			} catch {
				/* sin espacio o sin permiso: el borrador es una comodidad, no se avisa */
			}
		}, 400);
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, [key, value]);

	useEffect(() => {
		const reset = () => {
			dirty.current = false;
			setValue(fallback.current);
		};
		mounted.add(reset);
		return () => {
			mounted.delete(reset);
		};
	}, []);

	return [
		value,
		useCallback((next: T) => {
			dirty.current = true;
			setValue(next);
		}, []),
	];
}

/** Borra todo lo que la app guardó en el dispositivo y devuelve cuántas claves había. */
export function clearDrafts(): number {
	const storage = globalThis.localStorage;
	const keys = storage ? Object.keys(storage).filter((k) => k.startsWith(PREFIX)) : [];
	for (const k of keys) storage?.removeItem(k);
	for (const reset of mounted) reset();
	return keys.length;
}
