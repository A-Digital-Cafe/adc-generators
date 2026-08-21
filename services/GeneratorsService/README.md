# GeneratorsService

Entitlements y cuotas del subdominio `gen`. Declara sus features en `PlanService` (`plans:register`, fail-open) y mide el uso con ventana día/mes en MongoDB (`generators_usage`), local a propósito: una caída del motor de planes puede degradar límites, no perder lo ya gastado.

**Sólo gatea el output.** Convertir texto, generar paletas o medir contraste ocurre entero en el navegador y no tiene endpoint. El único gate es `POST /api/generators/usage/export`, que valida formato/resolución/transparencia contra el tier y descuenta cuota **antes** de que el cliente produzca el archivo.

- `GET /api/generators/me/limits` — tier + límites + consumo.
- `POST /api/generators/usage/export` — valida y descuenta. **Exige sesión**: sin ella devuelve `401`.

Ese `401` es deliberado: medir a los anónimos obligaría a identificarlos por IP, que es dato personal y un tratamiento nuevo. El tier anónimo se aplica en el cliente con el piso `GENERATORS_FREE_LIMITS` de `@common/types/generators`.
