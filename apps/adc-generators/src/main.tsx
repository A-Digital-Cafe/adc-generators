import "@ui-library/utils/react-jsx";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { redirectIfUnderMaintenance } from "@common/utils/module-availability.js";
import "@ui-library";
import "@ui-library/styles";
import "./fonts/load.ts";
import "./styles/tailwind.css";

if (!(await redirectIfUnderMaintenance("adc-generators"))) {
	const container = document.getElementById("root");
	if (container) {
		createRoot(container).render(
			<React.StrictMode>
				<App />
			</React.StrictMode>
		);
	}
}
