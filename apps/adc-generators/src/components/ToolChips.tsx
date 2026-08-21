export interface ToolChip {
	href: string;
	label: string;
	active: boolean;
}

/**
 * Selector de la herramienta activa dentro de un grupo.
 *
 * Son anclas y no botones porque cada herramienta **es** una URL: eso es lo que se
 * indexa y lo que la gente comparte. La activa va rellena y las demás delineadas,
 * arriba del área de trabajo, porque una lista de enlaces al pie no dice cuál se
 * está usando — que era justo lo que no se entendía.
 */
export function ToolChips({ items, label }: { readonly items: readonly ToolChip[]; readonly label: string }) {
	return (
		<nav aria-label={label} className="mb-5 flex flex-wrap gap-2">
			{items.map((item) => (
				<a
					key={item.href}
					href={item.href}
					aria-current={item.active ? "page" : undefined}
					className={`rounded-full border px-3 py-1.5 font-text text-sm transition-colors ${
						item.active
							? "border-primary bg-primary text-tprimary"
							: "border-text/15 text-text hover:border-accent hover:text-accent"
					}`}
				>
					{item.label}
				</a>
			))}
		</nav>
	);
}
