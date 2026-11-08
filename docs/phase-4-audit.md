# Cumbre20 — Auditoría de Fase 4

Fecha: 2026-11-08
Punto estable de recuperación: `7aeeacbeb8aab2c763249ee3a0f49d96f15543d6`

## Dependencias evaluadas

| Componente | Instalado | Última versión consultada | Decisión |
| --- | ---: | ---: | --- |
| Angular | 16.2.12 | 22.2.x | Postergar. Requiere migraciones mayores secuenciales y pruebas reales de autenticación/Firestore. |
| Angular CLI | 16.2.16 | 22.2.x | Mantener alineado con Angular 16. |
| Firebase Web SDK | 10.14.1 | 13.2.0 | Postergar. Es un cambio mayor y npm no ofrece una corrección compatible segura. |
| AngularFire | No utilizado | — | No aplica. El proyecto usa el SDK modular de Firebase directamente. |
| TypeScript | 5.1.6 | Angular 22 requiere 6.0.x | Mantener mientras siga Angular 16. |
| RxJS | 7.8.2 | Compatible con Angular actual y objetivo | Sin cambios. |
| Zone.js | 0.13.3 | Angular 22 usa una línea más reciente | Mantener mientras siga Angular 16. |
| Tailwind CSS | 3.4.19 | 4.x | Postergar; no aporta una corrección de seguridad urgente y cambia configuración/estilos. |

Angular 22 requiere una versión moderna de Node y TypeScript. La migración desde Angular 16 debe ejecutarse por etapas (16→17→18→19→20→21→22), aplicando las migraciones oficiales y comprobando cada etapa. No se realizó durante esta fase porque no había cuentas de prueba autorizadas ni dispositivos físicos para validar login, persistencia de sesión y flujos privados sin riesgo para producción.

## Seguridad

- Firestore separa los perfiles públicos de `userPrivate`.
- La lectura de contactos privados requiere ser propietario o tener un permiso explícito creado por el backend.
- Las solicitudes y participantes no pueden crearse directamente desde el navegador.
- Apps Script valida el Firebase ID Token antes de ejecutar acciones privadas.
- Apps Script comprueba propiedad de la partida, rol, cupos y estado antes de modificar datos.
- La aceptación es idempotente y usa identificadores determinísticos para participantes.
- Los datos públicos de partidas no incluyen correo, teléfono ni WhatsApp.
- No se detectaron claves privadas, cuentas de servicio ni archivos `.env` versionados.
- No se detectaron usos de `innerHTML` ni bypasses de sanitización de Angular.
- Vercel configura CSP, protección contra iframes, `nosniff`, política de referencia y permisos restrictivos.
- El build de producción no genera source maps públicos.

`npm audit --omit=dev` informó 19 avisos (10 moderados y 9 altos, ninguno crítico). Afectan Angular 16 y dependencias transitivas de Firebase. Las correcciones sugeridas por npm son cambios mayores y no se aplicaron automáticamente.

## Rendimiento

- Bundle inicial: 851,89 kB sin comprimir; transferencia estimada: 190,88 kB.
- Firestore permanece en un chunk diferido de 340,81 kB; no bloquea el bundle inicial.
- Los assets completos ocupan menos de 1 MB.
- El logo nuevo se entrega como WebP de 12,4 kB y favicon PNG de 7,5 kB.
- Persisten dos advertencias: bundle inicial 101,89 kB sobre el presupuesto y estilos de Home 2,92 kB sobre el presupuesto.
- No se aumentaron los presupuestos para esconder las advertencias.

## Pruebas ejecutables

```bash
npm run test:ci
npm run build:prod
npm audit --omit=dev
```

`test:ci` valida las vistas previas sociales, la ausencia de datos privados, estados cancelados/inexistentes, rutas protegidas, reglas de Firestore, autenticación de Apps Script, encabezados de seguridad, redirecciones internas y ausencia de bypasses XSS.

Karma requiere Chromium. En el entorno de automatización el binario existe, pero el sandbox impide crear el socket de `ProcessSingleton`; por eso las pruebas de navegador no pudieron ejecutarse allí.

## Recuperación

Si una publicación presenta una regresión:

1. Revertir el PR de Fase 4 desde GitHub.
2. Volver a desplegar el commit estable `7aeeacbeb8aab2c763249ee3a0f49d96f15543d6` en Vercel.
3. No es necesario revertir Firestore ni Apps Script: esta fase no modifica reglas, estructura de datos ni backend.

## Migración futura recomendada

Crear una rama exclusiva y actualizar una versión mayor de Angular por vez. En cada etapa: instalar la versión compatible de Node/TypeScript, aplicar `ng update`, compilar, ejecutar pruebas, validar login Google/correo, persistencia, perfiles, partidas, solicitudes, compartir y retorno posterior al acceso. Actualizar Firebase en una etapa separada para aislar cualquier regresión de Auth o Firestore.
