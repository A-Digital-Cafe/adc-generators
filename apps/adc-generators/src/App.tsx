import "@ui-library/utils/react-jsx";
import { useCallback, useEffect, useState } from "react";
import { router } from "@common/utils/router.js";
import { GENERATOR_GROUPS, findPage, groupOf, type GeneratorId } from "../catalog.ts";
import { AdcTabs } from "./components/AdcTabs.tsx";
import { HomePanel } from "./generators/panels/HomePanel.tsx";
import { renderGenerator } from "./generators/registry.tsx";
import { clearDrafts } from "./hooks/useLocalDraft.ts";
import { useT } from "./hooks/useT.ts";



/** Id de la pestaña de portada. No es un `GeneratorId`: la portada no es un generador. */
const HOME_TAB = "inicio";

function currentPath(): string {
	return globalThis.location?.pathname || "/";
}

/** `/letras/cursiva` → `{ group: "letras", slug: "cursiva" }`. */
function parse(pathname: string): { group: GeneratorId | null; slug?: string; known: boolean } {
	if (pathname === "/" || pathname === "") return { group: null, known: true };
	const [, first, second] = pathname.split("/");
	const group = GENERATOR_GROUPS.find((g) => g.id === first)?.id ?? null;
	if (!group) return { group: null, known: false };
	// El índice del grupo siempre existe; una subruta sólo si está en el catálogo.
	if (!second) return { group, known: true };
	return { group, slug: second, known: findPage(pathname) !== null };
}

function NotFound() {
	const t = useT();
	return (
		<section className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
			<h1 className="font-heading text-3xl text-text">{t("notFound.title", undefined, "Esa herramienta no existe")}</h1>
			<p className="mt-2 text-muted">{t("notFound.body", undefined, "Puede que el enlace esté viejo o mal escrito.")}</p>
			<p className="mt-4">
				<a href="/" className="text-accent underline underline-offset-2 hover:no-underline">{t("notFound.link", undefined, "Ver todos los generadores")}</a>
			</p>
		</section>
	);
}

/**
 * Router de la app.
 *
 * Las pestañas son afordancia visual, pero **la URL manda**: cada generador y cada
 * estilo tiene la suya, y ese es el motivo entero de que la app exista con esta
 * forma. Un estado local de pestaña dejaría veinticinco páginas sin dirección.
 */
export default function App() {
	const t = useT();
	const [path, setPath] = useState(currentPath);
	const [cleared, setCleared] = useState("");

	useEffect(() => router.setOnRouteChange(setPath), []);

	const clearNow = useCallback(() => {
		const count = clearDrafts();
		setCleared(
			count > 0
				? t("storage.cleared", undefined, "Listo: se borró lo que había guardado y los campos volvieron a su estado inicial.")
				: t("storage.nothingStored", undefined, "No había nada guardado en este dispositivo.")
		);
	}, [t]);

	useEffect(() => {
		if (!cleared) return;
		const timer = setTimeout(() => setCleared(""), 4000);
		return () => clearTimeout(timer);
	}, [cleared]);

	// Navegación interna sin recarga. Delegado en el contenedor porque los enlaces
	// los dibujan componentes de la UI library (`shadow: false`, así que sus anchors
	// están en el DOM claro y el evento burbujea hasta acá).
	const onClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		const anchor = (event.target as HTMLElement).closest("a");
		const href = anchor?.getAttribute("href");
		if (!anchor || !href?.startsWith("/") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
		event.preventDefault();
		router.navigate(href);
		globalThis.scrollTo?.({ top: 0 });
	}, []);

	const route = parse(path);
	// "Inicio" es una pestaña real y no un estado vacío: `adc-tabs` cae en la primera
	// cuando `activeTab` no coincide con ninguna, así que sin ella la portada aparece
	// marcada como "Letras".
	const tabs = [
		{ id: HOME_TAB, label: t("tabs.inicio", undefined, "Inicio") },
		...GENERATOR_GROUPS.map((g) => ({ id: g.id, label: t(`tabs.${g.id}`, undefined, g.label) })),
	];

	return (
		<adc-layout>
			<div onClick={onClick}>
				<nav className="mx-auto w-full max-w-6xl px-4 pt-4" aria-label="Generadores">
					<AdcTabs
						tabs={tabs}
						activeId={groupOf(path) ?? HOME_TAB}
						onChange={(id) => router.navigate(id === HOME_TAB ? "/" : `/${id}`)}
					/>
				</nav>

				{!route.known && <NotFound />}
				{route.known && (route.group === null ? <HomePanel /> : renderGenerator(route.group, route.slug))}

				<footer className="mx-auto w-full max-w-6xl px-4 py-8">
					<p className="font-text text-[11px] text-muted">
						{t("storage.notice", undefined, "Lo que escribís se guarda sólo en este dispositivo para que no lo pierdas al recargar; no viaja a ningún servidor.")}{" "}
						<button type="button" className="underline hover:no-underline" onClick={clearNow}>
							{t("actions.clearDrafts", undefined, "Borrar lo guardado en este dispositivo")}
						</button>
						.
					</p>
					{/* `aria-live`: el borrado no cambia nada visible salvo los campos, así que sin
					    esto no hay forma de saber que pasó algo. */}
					<p className="mt-1 min-h-4 font-text text-[11px] text-accent" aria-live="polite">
						{cleared}
					</p>
				</footer>
			</div>
		</adc-layout>
	);
}
