/**
 * Cliente mínimo de `DriveService` para guardar lo generado en la unidad del
 * usuario. Reusa el contrato presign → PUT → confirm de Drive; la elección de
 * carpeta la resuelve el picker federado (`RemoteFolderPicker`).
 *
 * Cross-subdominio: `gen` llama a `/api/drive` con la cookie de sesión del
 * dominio padre, y la CSP del `config.json` habilita ese `connect-src`.
 */

import { createAdcApi } from "@ui-library/utils/adc-fetch";

const api = createAdcApi({ basePath: "/api/drive", devPort: 3000 });

export interface DriveFileDTO {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	folderId: string | null;
}

interface PresignResult {
	fileId: string;
	uploadUrl: string;
	headers: Record<string, string>;
}

async function putBlob(presign: PresignResult, blob: Blob): Promise<boolean> {
	try {
		const res = await fetch(presign.uploadUrl, { method: "PUT", headers: presign.headers, body: blob });
		return res.ok;
	} catch {
		return false;
	}
}

export const driveClient = {
	/**
	 * Crea un archivo nuevo (presign → PUT → confirm).
	 *
	 * Sin clave de idempotencia: los endpoints del ciclo de subida son
	 * `skipIdempotency` en `DriveService` porque tienen que poder reintentarse en el
	 * acto — con una clave estable, reintentar tras un fallo de red daría 409.
	 */
	createFile: async (name: string, mimeType: string, blob: Blob, folderId: string | null): Promise<DriveFileDTO | null> => {
		const presign = await api.post<PresignResult>("/files/presign", { body: { name, mimeType, size: blob.size, folderId } });
		if (!presign.data) return null;
		if (!(await putBlob(presign.data, blob))) return null;
		const confirmed = await api.post<DriveFileDTO>(`/files/${presign.data.fileId}/confirm`);
		return confirmed.data ?? null;
	},

	/** Ruta legible de una carpeta caminando los padres (ej: "Mi unidad / A / B"). */
	folderPath: async (folderId: string | null): Promise<string> => {
		const ROOT = "Mi unidad";
		const names: string[] = [];
		let id = folderId;
		// Guard de profundidad por si hubiese datos inconsistentes (ciclo).
		for (let i = 0; id && i < 50; i++) {
			const folder = (await api.get<{ name: string; parentId: string | null }>(`/folders/${id}`)).data;
			if (!folder) break;
			names.unshift(folder.name);
			id = folder.parentId;
		}
		return [ROOT, ...names].join(" / ");
	},
};
