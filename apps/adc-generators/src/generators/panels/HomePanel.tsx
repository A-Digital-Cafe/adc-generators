import { GENERATOR_GROUPS, GENERATOR_PAGES } from "../../../catalog.ts";

/**
 * Portada: una tarjeta por grupo con enlaces a **cada** ruta hija.
 *
 * No es decoración — es el enlazado interno que hace que las páginas de estilo
 * existan para un buscador. Una portada con cuatro pestañas y ninguna URL dentro
 * deja veinticinco páginas huérfanas.
 */
export function HomePanel() {
	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-8">
			<h1 className="font-heading text-3xl text-text">Generadores y utilidades</h1>
			<p className="mt-2 max-w-2xl text-muted">
				Generadores chicos que funcionan en el navegador, sin cuenta y sin publicidad. Lo que generás es tuyo y podés guardarlo en tu
				Drive.
			</p>

			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{GENERATOR_GROUPS.map((group) => {
					const children = GENERATOR_PAGES.filter((p) => p.group === group.id && p.path !== group.path);
					return (
						<adc-card key={group.id} class="block p-4">
							<h2 className="font-heading text-xl text-text">
								<a href={group.path} className="text-accent underline underline-offset-2 hover:no-underline">{group.label}</a>
							</h2>
							<p className="mt-1 text-sm text-muted">{group.summary}</p>
							{children.length > 0 && (
								<ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-text text-sm">
									{children.map((child) => (
										<li key={child.path}>
											<a href={child.path} className="text-accent underline underline-offset-2 hover:no-underline">{child.title}</a>
										</li>
									))}
								</ul>
							)}
						</adc-card>
					);
				})}
			</div>
		</section>
	);
}
