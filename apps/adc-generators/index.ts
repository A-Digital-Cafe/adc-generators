import { AppWithSeo } from "@apps/AppWithSeo.js";
import type { PageMetaEntry } from "@common/types/SEO/Service.js";
import { GENERATOR_GROUPS, GENERATOR_PAGES } from "./catalog.js";

const SITE = "Abby's Digital Cafe";
const HOME_TITLE = "Generadores y utilidades";
const HOME_DESCRIPTION =
	"Convertí texto a letras decorativas, generá paletas de color y escribí con tipografías libres. Sin cuenta, sin publicidad y con el resultado guardable en tu Drive.";

/**
 * Generators App — el subdominio `gen`.
 *
 * Todo el SEO sale del catálogo (`catalog.ts`), que es también de donde el front
 * arma las pestañas: agregar un estilo agrega su URL al sitemap sin tocar nada
 * más. Es la razón de que el catálogo no viva dentro de `src/`.
 */
export default class GeneratorsApp extends AppWithSeo {
	async run() {
		this.registerSeo({
			sitemap: {
				paths: [
					{ path: "/", changefreq: "weekly", priority: 0.9 },
					...GENERATOR_PAGES.map((p) => ({ path: p.path, changefreq: "monthly" as const, priority: p.priority })),
				],
			},
			pageMeta: {
				defaults: {
					titleTemplate: `%s · ${SITE}`,
					description: HOME_DESCRIPTION,
					og: { siteName: SITE, locale: "es_ES", type: "website" },
					twitter: { card: "summary_large_image" },
					ogBrand: { background: "#fff4ec", color: "#5a2a12", brandName: "ADC Generadores" },
				},
				pages: [
					{
						path: "/",
						meta: {
							title: HOME_TITLE,
							description: HOME_DESCRIPTION,
							canonical: "/",
							jsonLd: {
								"@context": "https://schema.org",
								"@type": "WebApplication",
								name: `${HOME_TITLE} · ${SITE}`,
								description: HOME_DESCRIPTION,
								applicationCategory: "DesignApplication",
								operatingSystem: "Web",
								offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
							},
						},
					},
					...GENERATOR_PAGES.map(this.#pageMeta, this),
				],
			},
			llms: {
				title: `${HOME_TITLE} · ${SITE}`,
				description: HOME_DESCRIPTION,
				sections: ({ origin }) =>
					GENERATOR_GROUPS.map((group) => ({
						title: group.label,
						description: group.summary,
						links: GENERATOR_PAGES.filter((p) => p.group === group.id).map((p) => ({
							title: p.title,
							description: p.description,
							href: `${origin}${p.path}`,
						})),
					})),
			},
		});
		this.logger.logOk(`${this.name} ejecutándose (${GENERATOR_PAGES.length} rutas publicadas)`);
	}

	/** Meta de una ruta del catálogo. El `jsonLd` la declara como herramienta, no como artículo. */
	#pageMeta(page: (typeof GENERATOR_PAGES)[number]): PageMetaEntry {
		return {
			path: page.path,
			meta: {
				title: page.title,
				description: page.description,
				canonical: page.path,
				jsonLd: {
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: `${page.title} · ${SITE}`,
					description: page.description,
					applicationCategory: "UtilitiesApplication",
					operatingSystem: "Web",
					offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
				},
			},
		};
	}
}
