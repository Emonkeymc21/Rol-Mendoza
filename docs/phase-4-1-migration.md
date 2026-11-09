# CUMBRE20 — Fase 4.1

## Base y recuperación

- Base verificada en GitHub y producción: `7e6a0039f4cf9413fa035ac1e65a29c4702ee02d` (PR #23).
- Rama de trabajo: `codex/cumbre20-phase-4-1`.
- Referencia recuperable, también guardada en GitHub: `recovery/phase-4-1-base-7e6a003`.
- Lockfile original SHA-256: `2a6400ccef9466332f7acce890a56a766ecbd20196e388120a025babc7a2ca65`. El archivo completo sigue recuperable en la referencia anterior.
- Angular 16.2.12, CLI/build 16.2.16, Firebase 10.14.1, TypeScript 5.1.6, Tailwind 3.4.19, RxJS 7.8.2 y Zone.js 0.13.3.

## Secuencia aprobada

1. Auditar instalación, dependencias y bundle originales.
2. Angular: 16 → 17 → 18 → 19 con Node 18.20.8, compatible con esas etapas; 19 → 20 → 21 → 22 con Node 24.22.1. Cada paso aplica `ng update`, compila, prueba y se registra en un commit.
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

Pendiente de completar con los resultados observados en cada etapa.
