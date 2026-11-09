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
