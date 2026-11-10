# CUMBRE20 — Fase móvil, auditoría y límites

## Base y alcance
- Base: `main` 780ebf445a24dd8d557abcf8baeceb14c994b248, PR #25 integrado; Angular 22.2.5, Firebase 13.2.0, TypeScript 6.0.3.
- Rama: `feature/cumbre20-mobile-redesign`.
- Objetivo: estética de fantasía oscura, bordes cobre/dorado, tarjetas ilustradas a la izquierda y contenido a la derecha, formularios, menús y pantallas públicas y privadas coherentes.
- El alcance técnico **es exclusivamente de viewport 320–767 px**. `src/mobile-redesign.scss` contiene las variantes visuales bajo media queries. No altera rutas, modelos, backend, permisos, autenticación ni persistencia.
- Referencia gráfica: se aplicó la descripción textual del pedido; la imagen de referencia no está disponible como archivo en esta ejecución. Assets: imágenes ya presentes en `src/assets/branding`, sin atribuir imágenes genéricas a partidas específicas.

## Cómo se implementó
- `angular.json`: nueva hoja mobile posterior a `styles.scss`. No se cambiaron estilos base de escritorio.
- `src/mobile-redesign.scss`: variables cromáticas sólo en móviles; componentes de portada, buscadores, partidas, detalle, login/registro, onboarding, perfiles, solicitudes, notificaciones, comunidades, páginas informativas y footer. Aumentar especificidad sólo dentro del breakpoint evita conflictos con el CSS encapsulado Angular.
- Menú: conserva todas las rutas y roles actuales, agrega fondo tocable, bloqueo de scroll, liberación al navegar/resize, cierre Escape y devolución del foco al botón. Incluye áreas seguras.
- Compartir: conserva funciones nativa/WhatsApp/copiar y adopta hoja inferior en móviles. Se mantiene el menú de escritorio, con título/cierre ocultos fuera del breakpoint.
- Tarjetas: contenido del modelo real (estado, cupos, sistema, localidad, modalidad, máster), ilustración decorativa existente y acciones sin nuevos comportamientos. No se inventan portadas por partida.
- Un formulario con input de texto se renderiza con mínimo 16 px para Safari.

## Regresión visual y evidencias
- Línea base existente: `tests/visual/tablet-{dark,light}.png` y `desktop-{dark,light}.png` de Home en 768/1440 px. `tests/e2e/visual.spec.ts` retiene comparación estricta de esos cuatro píxeles; se omiten snapshots antiguos para <768 px porque allí el cambio es intencional. Los archivos originales no se sobrescribieron.
- `tests/e2e/mobile-redesign.spec.ts` obtiene capturas **reales del navegador** para 320, 360, 375, 390, 393, 412 y 430 px (Chromium); 320, 390 y 430 px (WebKit) y captura Home de 768/1024/1440/1920 px (Chromium). Verifica ausencia de scroll horizontal, estructura lateral real de las tarjetas, cierre de menú, bloqueo de fondo, hoja de compartir y posición en pantalla. En 393 px además captura las seis páginas públicas informativas y de autenticación.
- `tests/e2e/flows.spec.ts` sigue cubriendo permisos, registro, solicitudes, edición, publicación, notificaciones y compartir bajo emuladores.
- `.github/workflows/quality.yml` ejecuta `npm ci`, auditorías de dependencias, `npm run build:prod`, CSP, unitarias, pruebas de emuladores y E2E en Chromium/WebKit.
- Matriz requerida completa de **todas** las rutas/estados y 768/1024/1440/1920 como comparación pixel-perfect queda condicionada a la ejecución real y capturas del pipeline; las rutas privadas necesitan autenticación emulada y no se ensayan anónimamente en producción.
- No se consideran dispositivos físicos las simulaciones Playwright. Pendientes: teclado virtual real, navegador iOS y Android físico, lector de pantalla, métricas RUM INP y validación de accesibilidad manual.

## Condiciones de integración
No integrar ni promover a producción mientras exista un fallo crítico de build, CSP, reglas, E2E o snapshot de escritorio, un desbordamiento móvil no justificado o un preview no accesible/verificado. Este documento no implica que las pruebas hayan pasado; consultar el PR y sus jobs del commit exacto.
