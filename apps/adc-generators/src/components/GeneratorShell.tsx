import type { ReactNode } from "react";

/**
 * Encabezado común de cada generador: el `h1` con el nombre de la herramienta y su
 * descripción.
 *
 * Existe porque ese par es **contenido indexable**, no decoración: cada ruta tiene
 * que traer su propio título y su propio texto, o todas se ven iguales para un
 * buscador y compiten entre ellas.
 */
export function GeneratorShell({
	title,
	description,
	aside,
	children,
}: {
	readonly title: string;
	readonly description: string;
	readonly aside?: ReactNode;
	readonly children: ReactNode;
}) {
	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-6">
			<header className="mb-5">
				<h1 className="font-heading text-2xl text-text sm:text-3xl">{title}</h1>
				<p className="mt-1 max-w-2xl text-muted">{description}</p>
				{aside}
			</header>
			{children}
		</section>
	);
}
