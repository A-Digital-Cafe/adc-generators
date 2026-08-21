import { useEffect, useState, type ComponentType } from "react";
import { getPlatformApps, getPlatformAppOrigin } from "@ui-library/utils/platform-links";
import { lazyLoadRemoteComponent } from "@adc/utils/react/loadRemoteComponent";

interface FolderPickerProps {
	onChoose: (folderId: string | null, name: string) => void;
	onCancel: () => void;
}

/**
 * Navegador de carpetas del Drive: se obtiene **federado** desde adc-drive
 * (`adc_drive` → `./FolderPicker`), así esta app no reimplementa la UX ni el
 * cliente del Drive. Se carga bajo demanda (lazy) y no rompe la página si el
 * preset de Drive no está instalado — el guardado simplemente no se ofrece.
 */
let pickerPromise: Promise<ComponentType<FolderPickerProps>> | null = null;

function loadFolderPicker(): Promise<ComponentType<FolderPickerProps>> {
	pickerPromise ??= (async () => {
		const drive = getPlatformApps().find((a) => a.id === "drive");
		const origin = drive ? getPlatformAppOrigin(drive) : "http://localhost:3032";
		const { Component } = await lazyLoadRemoteComponent({
			remoteEntryUrl: `${origin}/remoteEntry.js`,
			remoteName: "adc_drive",
			scope: "./FolderPicker",
			moduleName: "drive-folder-picker",
			framework: "react",
		});
		return Component as ComponentType<FolderPickerProps>;
	})();
	return pickerPromise;
}

export default function RemoteFolderPicker(props: Readonly<FolderPickerProps>) {
	const [Picker, setPicker] = useState<ComponentType<FolderPickerProps> | null>(null);

	useEffect(() => {
		let alive = true;
		loadFolderPicker().then((Component) => alive && setPicker(() => Component));
		return () => {
			alive = false;
		};
	}, []);

	if (!Picker) return <p className="px-2 py-6 text-center text-sm opacity-60">Cargando…</p>;
	return <Picker {...props} />;
}
