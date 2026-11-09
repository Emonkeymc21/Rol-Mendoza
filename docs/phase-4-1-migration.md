# CUMBRE20 — Fase 4.1

## Base y recuperación

- Base verificada en GitHub y producción: `7e6a0039f4cf9413fa035ac1e65a29c4702ee02d` (PR #23).
- Rama de trabajo: `codex/cumbre20-phase-4-1`.
- Referencia recuperable, también guardada en GitHub: `recovery/phase-4-1-base-7e6a003`.
- Lockfile original SHA-256: `2a6400ccef9466332f7acce890a56a766ecbd20196e388120a025babc7a2ca65`. El archivo completo sigue recuperable en la referencia anterior.
- Angular 16.2.12, CLI/build 16.2.16, Firebase 10.14.1, TypeScript 5.1.6, Tailwind 3.4.19, RxJS 7.8.2 y Zone.js 0.13.3.

## Secuencia aprobada

1. Auditar instalación, dependencias y bundle originales.
2. Angular: 16 → 17 y 17 → 18 con Node 18.20.8; desde la validación de Angular 18, Node 22.22.3 (compatible con Angular 18 a 22). Vercel y el QA definitivo usarán Node 24.x. Cada paso aplica `ng update`, compila, prueba y se registra en un commit.
3. Firebase: 10 → 11 → 12 → 13 en etapas separadas, leyendo las notas oficiales y probando Auth/Firestore. No incorporar AngularFire ni cambiar usuarios, documentos o reglas de producción.
4. Agregar pruebas reales de reglas contra Firebase Emulator Suite y flujos aislados de jugador/DM; Chromium/WebKit y CI. No utilizar el proyecto real para generar fixtures.
5. Resolver avisos restantes y presupuestos sin elevar sus límites. Auditar nuevamente instalación completa y producción.
6. Verificar un despliegue de prueba antes de considerar integrar la migración.

Los objetivos estables consultados son Angular 22.2.5 (CLI/build 22.2.6) y Firebase 13.2.0. TypeScript debe permanecer dentro del rango de Angular, aunque npm ofrezca una versión superior.

## Rollback

Si una publicación completa presenta regresión, revertir el PR de migración y reconstruir `recovery/phase-4-1-base-7e6a003` en Vercel. La referencia conserva `package.json`, lockfile y fuentes originales. No ejecutar migraciones de datos ni revertir usuarios/Firestore/Sheets: esta actualización debe conservar sus contratos. Un rollback de tráfico en Vercel puede desactivar la asignación automática de dominios; comprobarla antes del siguiente despliegue.

## Fuentes oficiales

- https://angular.dev/reference/versions
- https://angular.dev/update-guide
- https://angular.dev/cli/update
- https://firebase.google.com/support/release-notes/js

## Registro de ejecución

Los resultados siguientes corresponden a ejecuciones observadas; cada limitación se distingue de una prueba aprobada.

- Angular 17: core 17.3.12, CLI 17.3.17, TypeScript 5.4.5, Node v18.20.8. Migraciones oficiales aplicadas; build, test:ci y compilación de las pruebas Jasmine aprobados. Karma/E2E se validan en la infraestructura ampliada de esta fase.

- Angular 18: core 18.2.14, CLI 18.2.21, TypeScript 5.4.5, Node v22.22.3. Migraciones oficiales aplicadas; build, test:ci y compilación de las pruebas Jasmine aprobados. Karma/E2E se validan en la infraestructura ampliada de esta fase.

- Angular 19: core 19.2.25, CLI 19.2.27, TypeScript 5.8.3, Node v22.22.3. Migraciones oficiales aplicadas; build, test:ci y compilación de las pruebas Jasmine aprobados. Karma/E2E se validan en la infraestructura ampliada de esta fase.

- Angular 20: core 20.3.35, CLI 20.3.42, TypeScript 5.8.3, Node v22.22.3. Migraciones oficiales aplicadas; build, test:ci y compilación de las pruebas Jasmine aprobados. Karma/E2E se validan en la infraestructura ampliada de esta fase.

- Angular 21: core 21.2.26, CLI 21.2.29, TypeScript 5.9.3, Node v22.22.3. Migraciones oficiales aplicadas; build, test:ci y compilación de las pruebas Jasmine aprobados. Karma/E2E se validan en la infraestructura ampliada de esta fase.

- Angular 22: core 22.2.5, CLI 22.2.6, TypeScript 6.0.3, Node v22.22.3. Migraciones oficiales aplicadas; build, test:ci y compilación de las pruebas Jasmine aprobados. Karma/E2E se validan en la infraestructura ampliada de esta fase.

- Angular 22: la instalación inicial se interrumpió durante la resolución/instalación. La recuperación regeneró el lockfile a partir del manifiesto objetivo revisado (sin force ni legacy-peer-deps) y ejecutó las migraciones oficiales `--migrate-only --from 21.2.29/21.2.26 --to 22.2.6/22.2.5`. Los controles de etapa pasaron. Se quitaron `baseUrl`, `downlevelIteration` y las supresiones añadidas por la migración; se conserva strictTemplates.
- Se ejecutaron las migraciones oficiales `use-application-builder`, `migrate-karma-to-vitest` y `refactor-jasmine-vitest`. Build moderno aprobado y 2/2 pruebas originales aprobadas en Vitest. El AppModule se conserva; bootstrap usa platformBrowser, recomendado por Angular. Se retiraron Karma/Jasmine y los paquetes Angular de animaciones/plataforma dinámica sin uso en la aplicación. Se mantiene la carpeta de salida previa mediante outputPath.browser vacío.

### Firebase 10: referencia funcional con emuladores

Se incorporaron 27 pruebas ejecutables contra Auth/Firestore y el código real de Apps Script con planillas locales; pasaron 27/27 con Firebase 10.14.1. Vitest amplía las dos pruebas originales a 19: guards, contactos y continuidad del acceso. No se conectan estos tests a producción. El proyecto `demo-cumbre20` y hosts de loopback son obligatorios.

### Firebase 11

SDK 11.10.0, rules-unit-testing 4.0.1. Instalación, compilación de producción, 19 pruebas Vitest, contratos de compartir/regresión, 27 pruebas Auth/Firestore/Apps Script y `npm ls --all` aprobados. No se modificaron reglas, estructura de datos, configuración de producción ni Apps Script.

Firebase 12.19.0 presentó TS2503 en `Timestamp.fromInstant/toInstant`. Se habilitó la biblioteca de tipos `ESNext.Temporal` incluida en TypeScript 6, conservando target ES2022. No se silenció skipLibCheck ni se introdujo uso de Temporal en la aplicación. Referencias: https://firebase.google.com/docs/reference/js/firestore.timestamp y https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html .

### Firebase 12

SDK 12.19.0, rules-unit-testing 5.0.0. Instalación, compilación de producción, 19 pruebas Vitest, contratos de compartir/regresión, 27 pruebas Auth/Firestore/Apps Script y `npm ls --all` aprobados. No se modificaron reglas, estructura de datos, configuración de producción ni Apps Script.

### Firebase 13

SDK 13.2.0, rules-unit-testing 6.0.0. Instalación, compilación de producción, 19 pruebas Vitest, contratos de compartir/regresión, 27 pruebas Auth/Firestore/Apps Script y `npm ls --all` aprobados. No se modificaron reglas, estructura de datos, configuración de producción ni Apps Script.

### Seguridad y QA de navegador

Las auditorías completas y de producción alcanzaron cero vulnerabilidades de toda severidad el 2026-11-09. Se actualizaron también las herramientas de pruebas; overrides analizados para gRPC 1.14.7, glob 14.0.4, uuid 11.1.1 y Pub/Sub 6.3.2. `npm update undici` corrigió el último aviso de las herramientas sin forzar una versión mayor. El emulador ejecutó correctamente sus contratos con este árbol.

Playwright contiene 12 escenarios (desktop Chromium/WebKit, Android Chromium e iPhone WebKit). `--list` sólo comprueba descubrimiento, no equivale a ejecución aprobada. Se configuró CI para ejecutar navegadores en Ubuntu con Java 21 y Node 24. El servidor local y Firebase demo rechazan configuraciones de producción.

### Carga diferida

Se conservaron NgModules. Home permanece en la carga inicial; el resto de páginas utiliza módulos por ruta. Las rutas, guards y metadatos originales se conservan. Se adaptó la detección de edición de perfil al padre de la ruta vacía del módulo. Producción: 697.30 kB iniciales / 175.68 kB de transferencia estimada frente a 852.00 / 190.79 originales. Ya no aparece la advertencia inicial de 750 kB. Permanece Home SCSS 15.98 kB frente al presupuesto de 13 kB; los límites no cambiaron. Se descartó una alternativa de CSS que aumentaba el tamaño. Vitest y contratos existentes siguen aprobados.

## Resultado de dependencias

| Componente | Base estable | Rama migrada |
|---|---|---|
| Angular | 16.2.12 | 22.2.5 |
| Angular CLI / build | 16.2.16 / build-angular | 22.2.6 / @angular/build |
| Firebase modular | 10.14.1 | 13.2.0 |
| TypeScript | 5.1.6 | 6.0.3 |
| Node para despliegue y CI | no fijado en engines | 24.x |
| Tailwind | 3.4.19 | 3.4.19 |
| RxJS | 7.8.2 | 7.8.2 |
| Zone.js | 0.13.3 | 0.15.1 |
| Pruebas de componentes | Karma/Jasmine | Vitest 5.1.0 / jsdom 31.0.0 |

`npm outdated` se ejecutó antes y después. Permanecen ofertas de versiones mayores de Tailwind, TypeScript y Zone.js. TypeScript 7 queda fuera del rango de Angular 22; no se requiere cambiar el diseño Tailwind ni el modo de detección de cambios para corregir la auditoría. No hay avisos de seguridad sin resolver en el árbol auditado. Ver [inventario de 75 paquetes y avisos](qa/dependency-audit.md) y JSON originales/conclusivos en `docs/qa`.

## Alcance de pruebas

- 22 pruebas Vitest ejecutadas: se conservaron las dos originales y se agregaron guards, normalización de contactos, continuidad tras email/Google y Web Share/copiar/WhatsApp.
- 28 pruebas con emuladores: tres SDK Auth/Firestore, once de operaciones Apps Script y catorce de reglas Firestore. Las primeras 27 se ejecutaron con Firebase 10, 11, 12 y 13; la prueba adicional de rate limit se ejecutó con Firebase 13. Auth registra/verifica email, recupera contraseñas, inicia/cierra sesión y fuerza renovación de token. Google se prueba con un token emulado, sin OAuth real.
- Las reglas se ejecutan en el emulador, no sólo mediante patrones de texto: visitante, perfil ajeno, escrituras backend protegidas, solicitudes, notificaciones, contacto habilitado sólo a la pareja aprobada, revocación por bloqueo, perfiles incompletos/inactivos y comunidades.
- Apps Script ejecuta el `Code.gs` versionado. Solamente se adaptan SpreadsheetApp, caché, lock y transporte a infraestructura local. Publicar, editar, solicitar, duplicados, aceptar/rechazar, último cupo, eliminación de participante, estados y compensación de Sheets ante error Firestore se prueban con Auth/Firestore emulados. No equivale a ejecutar la infraestructura alojada de Google Sheets/Apps Script.
- Los contratos del endpoint de compartir y las comprobaciones estáticas existentes se conservan como controles adicionales, separados de las pruebas reales anteriores.
- Playwright ejecuta los flujos de UI con la aplicación, SDK, emuladores y Apps Script local. Hay 16 escenarios distribuidos en cuatro proyectos: desktop Chromium, Android Chromium, desktop WebKit e iPhone WebKit. Los resultados definitivos se registran más abajo una vez completado CI.

### Aislamiento

No se modificaron `firestore.rules`, índices, `Code.gs`, entornos de producción ni el contrato API 8.0.0. No se crearon datos de prueba en producción. Los tests Node exigen hosts 127.0.0.1 y el SDK de UI sólo activa emuladores con compilación e2e, proyecto `demo-cumbre20` y URL local. Playwright bloquea otros endpoints; permite los assets públicos de fuentes, el bootstrap de Google requerido por Firebase móvil y los assets Material de la UI oficial del Auth emulator. Los tokens y las cuentas en trazas son exclusivamente emulados.

### Incidencias de la infraestructura de pruebas resueltas

La primera ejecución Chromium pasó las páginas públicas y compartir, pero detectó un selector que asumía un atributo HTML `value` en radios con binding Angular. Se cambió a selección por rol y nombre accesible. Los navegadores móviles/WebKit activan el bootstrap de Google: se permitió ese recurso público sin habilitar endpoints reales de Auth/Firestore. WebKit no admite cumplir una ruta interceptada con 302; el endpoint se prueba con proxy HTTP real del servidor de desarrollo. Se acotó el botón de logout al encabezado porque el perfil tiene otro y el menú desktop usa role=menuitem.

## Rendimiento observado

| Medida de build de producción | Angular 16 / Firebase 10 | Angular 22 / Firebase 13 |
|---|---:|---:|
| Inicial, Home incluido | 852.00 kB | 697.30 kB |
| Transferencia inicial estimada por CLI | 190.79 kB | 175.68 kB |
| Firestore diferido | 340.81 kB | 474.51 kB |
| SCSS Home | 15.92 kB | 15.98 kB |

El inicial baja 18.2% y su transferencia estimada 7.9%. Firestore moderno crece 39.2%; sigue en un chunk separado y se limita mediante exportaciones modulares explícitas. No se presenta esa subida como una mejora. La carga diferida evita descargar los formularios y pantallas secundarias al entrar en Home. No se cambiaron presupuestos. Permanece una advertencia SCSS de Home, 2.98 kB sobre 13 kB. No hay una medición de Core Web Vitals de usuarios reales ni una comparación de latencia móvil física; los tamaños no equivalen a esas métricas.

## Límites que requieren acceso real

- Google OAuth real, entrega real de email y prueba con cuentas autorizadas conectadas a la infraestructura alojada.
- Teclado virtual, notch/safe areas de hardware, hoja nativa de compartir y persistencia tras cerrar la app/navegador en Android/iOS físicos. [Checklist específico](qa/physical-device-checklist.md).
- Acceso al preview protegido de Vercel: el despliegue de esta rama compiló como READY, pero `web_fetch_vercel_url` devolvió 403 en `read_protection_bypass`. No hay credenciales Vercel CLI/OIDC disponibles en este entorno. Falta autorización de la conexión para el proyecto/equipo; no se deshabilitó protección.
- Logs privados de producción y de build Vercel: no se certifica su ausencia de errores sin acceso autorizado. La disponibilidad pública se comprueba aparte.

El estado READY acredita el build de Vercel; no se cuenta como prueba funcional de su URL. El criterio de publicación exige revisar ese preview antes de integrar. Por esta limitación, el PR debe permanecer en borrador hasta completar los controles críticos.

La ejecución de navegador confirmó el rechazo de una reapertura en menos de tres segundos, previsto por `rateLimit_`. La prueba ahora avanza únicamente el reloj de la caché local y espera estado Activa antes de logout. Una prueba adicional de backend exige rechazo rápido y éxito tras ese período. No se modificó ni desactivó el límite real. También se incorporó un recorrido Google `signInWithPopup` contra la UI del Auth emulator; su resultado se registra con CI.

Lockfile migrado SHA-256: `b08f39484f4f8563a564d8655707adfa7aedc09cefc8e69d82e50ecb49d8dc05`.

Las acciones oficiales de CI se fijaron por SHA en sus versiones actuales con runtime Node 24 (checkout/setup-node/upload-artifact v6 y setup-java v5); sus manifests oficiales se verificaron antes del cambio. Se eliminó el doble disparo push+PR sobre la rama, conservando PR y push a main.

Angular 22 usa la política oficial Baseline del 2026-05-07 para navegadores (https://angular.dev/reference/versions#browser-support). Los proyectos de Playwright ejercitan motores actuales; no certifican todas las versiones mínimas de esa política ni teléfonos antiguos.

## Producción y continuidad

La consulta final de `main` sigue en `7e6a0039f4cf9413fa035ac1e65a29c4702ee02d`. Las rutas públicas `/`, `/partidas`, `/ingresar` y `/registrarme` respondieron HTTP 200. El logo WebP respondió 200 (12.388 bytes). La API alojada respondió health 8.0.0 / auth configured y una partida pública. Son comprobaciones de lectura: el HTML inicial de la SPA no reemplaza una prueba de interacción.

Un intento adicional de compartir sobre producción terminó en timeout al establecer el túnel HTTPS del entorno; no se clasifica como fallo demostrado de la aplicación ni como prueba aprobada. La lógica y los encabezados de compartir se prueban con el handler real en Node/HTTP local y Playwright; el archivo `api/share-game.js` no se modificó respecto del PR #23.

La documentación histórica `docs/phase-4-audit.md` se conserva. `AGENTS.md` incluye los comandos nuevos, límites de publicación, misión del proyecto y referencia a este informe. La rama recuperable conserva el estado estable previo; los commits de esta rama permiten retomar la migración sin reconstruir ni perder el trabajo.

## Compatibilidad corregida

| Cambio | Adaptación comprobada |
|---|---|
| Angular 19 cambia el valor predeterminado standalone | Las migraciones oficiales preservaron `standalone: false` y los NgModules existentes. |
| Angular 21 y 22 cambian detección de cambios | `provideZoneChangeDetection()` y `ChangeDetectionStrategy.Eager` conservan el comportamiento previo. |
| Angular 22 cambia el transporte HTTP predeterminado | `withXhr()` conserva XHR e interceptores existentes. |
| Plantillas y diagnósticos actuales | Migración oficial a bloques @if/@for; se corrigieron las cuatro cadenas opcionales que ya estaban acotadas por @if. No se desactivó strictTemplates. |
| Compilador/bundler actual | `@angular/build:application`, resolución bundler y bootstrap `platformBrowser`. Sin compiler dinámico ni paquete de animaciones sin uso. |
| Salida del bundler moderno | `outputPath.browser` vacío mantiene `dist/rol-mendoza`, sin cambiar rewrites ni directorio Vercel. |
| Tipos Firestore recientes | Biblioteca `ESNext.Temporal` de TypeScript 6; no se introdujo uso runtime de Temporal ni se omitió la revisión de tipos. |
| Pruebas Karma | Migraciones oficiales a Vitest y revisión de las dos pruebas originales; tests ejecutables ampliados, sin quitar cobertura. |
| SDK Firebase modular diferido | Acceso Firestore central con una promesa por instancia; exportaciones explícitas. Emuladores conectados antes de cualquier operación en la compilación de QA. |
| Rutas con carga diferida | Guards/metadatos conservados; edición de perfil reconoce la ruta del padre. Los escenarios de UI comprueban publicación, edición y continuidad del destino. |

WebKit completó el recorrido funcional y el popup Google emulado, pero su comprobación de errores detectó rechazos CORS de los canales HTTP del emulador Firestore al navegar. Se añadió un proxy HTTP de QA hacia el puerto 8080 y el SDK de QA usa el puerto local de la aplicación. No se desactivó seguridad del navegador, reglas ni comprobación de errores. Esta adaptación sólo aplica al entorno e2e y no certifica CORS de los servicios alojados; se mantiene pendiente la revisión del preview.
