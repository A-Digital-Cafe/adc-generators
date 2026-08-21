/**
 * Serialización de un kit de marca (paleta + tipografías) y su guardado en Drive.
 *
 * El kit es un archivo del usuario, no una fila en una colección nuestra: reusa el
 * flujo de presign, la cuota del plan de Drive alcanza como límite y no crea un
 * tratamiento de datos que haya que declarar en el RAT.
 */

import { BRAND_KIT_EXT, BRAND_KIT_MIME, type BrandKit, type PaletteColor } from "@common/types/generators/index.ts";
import { safeFileName } from "../export/download.ts";
import { driveClient, type DriveFileDTO } from "./driveClient.ts";

export function serializeBrandKit(name: string, palette: readonly PaletteColor[], fonts: readonly string[]): string {
	const kit: BrandKit = {
		version: 1,
		name,
		// Sin `locked`: es estado de la sesión de edición, no del kit guardado.
		palette: palette.map(({ hex, name: colorName }) => ({ hex, name: colorName })),
		fonts: [...fonts],
	};
	return `${JSON.stringify(kit, null, "\t")}\n`;
}

export async function saveBrandKitToDrive(
	name: string,
	palette: readonly PaletteColor[],
	fonts: readonly string[],
	folderId: string | null
): Promise<DriveFileDTO | null> {
	const blob = new Blob([serializeBrandKit(name, palette, fonts)], { type: BRAND_KIT_MIME });
	return driveClient.createFile(safeFileName(name, BRAND_KIT_EXT), BRAND_KIT_MIME, blob, folderId);
}
