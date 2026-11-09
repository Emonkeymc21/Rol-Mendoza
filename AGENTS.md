# CUMBRE20: continuidad y mantenimiento

- Antes de modificar, leer `docs/phase-4-audit.md`, consultar el estado real de `main`, los PR y producción. Los commits del informe son referencias históricas; no asumir que siguen siendo el último commit.
- Continuar el proyecto existente. CUMBRE20 conecta jugadores, DMs, mesas y comunidades de Mendoza; complementa a las comunidades existentes.
- Conservar las funciones de las fases 1 a 4. No reconstruir, eliminar funciones ni modificar datos, permisos o backend sin una necesidad comprobada.
- La rama Fase 4.1 migra Angular 16 → 22.2.5 (CLI/build 22.2.6) y Firebase 10 → 13.2.0 en etapas separadas. Node 24.x, TypeScript 6.0.3. Leer también `docs/phase-4-1-migration.md` y consultar el PR #24 antes de asumir que esta migración está en producción. No usar `npm audit fix --force` ni downgrades sin análisis.
- Firebase modular administra Auth y Firestore; no se usa AngularFire. La API de partidas es Apps Script 8.0.0 con Google Sheets. No confundirla con el registro de usuarios, que usa Firebase.
- Corregir problemas reproducidos con cambios mínimos y pruebas relacionadas. `npm run test:ci` no sustituye las pruebas integrales con cuentas autorizadas ni dispositivos Android/iOS reales.
- El endpoint de compartir distingue bots y personas por User-Agent. Sus respuestas deben usar `Cache-Control: private, no-store`; una caché compartida puede entregar la vista previa a una persona en lugar de redirigirla.
- Las credenciales y sesiones de prueba no se versionan. No crear usuarios, partidas, solicitudes o comentarios de prueba en producción sin autorización para esos datos.
- Después de una corrección de compartir, comprobar en el mismo enlace: bot (200 + Open Graph), persona (302 al detalle), otro bot y otra persona. También comprobar partida inexistente (404) e identificador inválido (400).
- Mantener documentadas las pruebas ejecutadas, sus límites y los pendientes. Publicar únicamente cambios necesarios y verificados.

- QA: `npm ci`, `npm ls --all`, `npm audit`, `npm audit --omit=dev`, `npm run build:prod`, `npm run test:unit`, `npm run test:ci`, `npm run test:emulators`, `npm run test:e2e`. CI usa Java 21 y navegadores Chromium/WebKit. Sólo proyectos Firebase demo en loopback para tests; `firebase.test.json` no se despliega.
- Home sigue en la carga inicial. Las páginas secundarias usan NgModules con carga diferida; conservar guards y datos de rutas. Perfil/editar detecta el path del padre del módulo.
- No integrar una migración con comprobaciones críticas fallidas o sin acceso al preview. Las comprobaciones físicas pendientes se registran en `docs/qa/physical-device-checklist.md`.

- Fase 4.1: Angular 22/Firebase 13 y auditorías cero. El usuario autorizó integrar y publicar después del QA. Consultar PR #24, CI y Vercel para el SHA/estado actual; no asumir que una referencia histórica sigue siendo producción.

- Reverificación 9/11: acceso Vercel habilitado. Se corrigió el hash CSP del script Beasties generado, que dejaba CSS en media=print en el preview. Ejecutar `npm run build:prod` y `npm run test:production-csp` juntos; conservar CSP estricta y critical CSS. Consultar el último CI/preview del PR #24 para el estado de aceptación.

- WebKit: el detector E2E comprueba ErrorEvent y unhandledrejection reales en todas las páginas, conserva cada pageerror y rechaza los inesperados. Sólo separa el diagnóstico nativo Fetch API cannot load http de canales Firestore del proyecto demo en loopback, confirmado por evidencia y Firebase #4527. No ampliar esa clasificación. El control negativo provoca una excepción con texto idéntico y una promesa rechazada y exige que el detector falle. No usar flags privados del SDK ni cambios de permisos para estos avisos.

- Fase 5 (PR #25, verificar estado real antes de asumir merge): Angular híbrido con Home/informativas prerenderizadas, listados/detalles/comunidades SSR anónimo y rutas privadas Client. /partidas/nueva debe preceder /partidas/:id en rutas servidor. No inicializar Firebase Auth en SSR. La actividad de Home carga en navegador con placeholders honestos. Compartir conserva private,no-store.
- QA Fase 5: test:e2e:production usa build optimizado, CSP y emuladores; audit:browser compara el commit c733dd6 y el candidato en un runner. No usar puntuación SEO como prueba del HTML. Ver docs/phase-5-audit.md para métricas y límites. Nuevo diseño móvil: rama separada, sólo <=767px; no modificar escritorio ni contratos.
