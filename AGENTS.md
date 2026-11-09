# CUMBRE20: continuidad y mantenimiento

- Antes de modificar, leer `docs/phase-4-audit.md`, consultar el estado real de `main`, los PR y producción. Los commits del informe son referencias históricas; no asumir que siguen siendo el último commit.
- Continuar el proyecto existente. CUMBRE20 conecta jugadores, DMs, mesas y comunidades de Mendoza; complementa a las comunidades existentes.
- Conservar las funciones de las fases 1 a 4. No reconstruir, eliminar funciones ni modificar datos, permisos o backend sin una necesidad comprobada.
- Mantener Angular 16.2 y Firebase 10.14 hasta disponer de una migración controlada: comparar compatibilidad, actualizar Angular por etapas y validar Auth, Firestore y partidas. Firebase se migra por separado. No usar `npm audit fix --force` ni aplicar downgrades sugeridos por npm sin análisis.
- Firebase modular administra Auth y Firestore; no se usa AngularFire. La API de partidas es Apps Script 8.0.0 con Google Sheets. No confundirla con el registro de usuarios, que usa Firebase.
- Corregir problemas reproducidos con cambios mínimos y pruebas relacionadas. `npm run test:ci` no sustituye las pruebas integrales con cuentas autorizadas ni dispositivos Android/iOS reales.
- El endpoint de compartir distingue bots y personas por User-Agent. Sus respuestas deben usar `Cache-Control: private, no-store`; una caché compartida puede entregar la vista previa a una persona en lugar de redirigirla.
- Las credenciales y sesiones de prueba no se versionan. No crear usuarios, partidas, solicitudes o comentarios de prueba en producción sin autorización para esos datos.
- Después de una corrección de compartir, comprobar en el mismo enlace: bot (200 + Open Graph), persona (302 al detalle), otro bot y otra persona. También comprobar partida inexistente (404) e identificador inválido (400).
- Mantener documentadas las pruebas ejecutadas, sus límites y los pendientes. Publicar únicamente cambios necesarios y verificados.
