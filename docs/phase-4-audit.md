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

## Informe de continuidad y cierre de la revisión

Fecha local de revisión: 2026-11-08 (America/Argentina/Buenos_Aires).
Las ejecuciones también registran 2026-11-09 en UTC.

### Estado recuperado de GitHub y producción

Se consultaron GitHub y Vercel; no se tomó el resumen del chat como única fuente.

| Elemento | Evidencia recuperada |
| --- | --- |
| PR #19 | Integrado; commit `789994ec0ca0d3f958817085a2fac7a1f2358339`. |
| PR #20 | Integrado; commit `4994eee51d4d2e30a53f5333213e3021929b0c80`. |
| PR #21 | Integrado; commit `7aeeacbeb8aab2c763249ee3a0f49d96f15543d6`. |
| PR #22 | Integrado el 2026-11-08 a las 21:15:36 UTC; commit `4f35ce0fbdd65ec566197135bf7b920afa4bff8b`. |
| `main` al recuperar la sesión | `4f35ce0fbdd65ec566197135bf7b920afa4bff8b`, confirmado por la API de GitHub y `git fetch origin main`. |
| Producción al recuperar la sesión | Deployment `dpl_4DP13eqqHiwQeeNhKduV9JTeyh3x`, `READY`, destino `production`, rama `main`, mismo commit que el PR #22. |
| Dominio | `https://rol-mendoza-2026.vercel.app/`. |
| Comprobación de GitHub | Estado Vercel `success`; no hay ejecuciones de GitHub Actions asociadas al commit #22. |

Se verificaron los 16 archivos del PR #22. No cambia el lockfile, Firestore, Apps Script ni estructuras de datos. La copia de trabajo de esta revisión parte del `main` real, en una rama separada; no reemplaza el proyecto anterior.

### Pruebas que pueden acreditarse

El PR #22 declara compilación, `test:ci`, `git diff --check` y auditoría correctos. No hay logs de GitHub Actions que permitan certificar retrospectivamente esas ejecuciones. Esta revisión volvió a ejecutar los comandos y comprobó su resultado directamente.

| Comprobación | Resultado y alcance |
| --- | --- |
| `npm run test:ci` | Pasa. Incluye los dos scripts siguientes; no es una suite E2E. |
| `test-share-preview.cjs` | Ejecuta el handler con peticiones/respuestas simuladas y sustituye `fetch`: bots WhatsApp/Telegram/Discord, redirección humana, escape HTML, exclusión de contactos, cancelada, inexistente e identificador inválido. La revisión agrega el contrato de caché y una petición humana posterior al bot. |
| `test-stability.cjs` | Inspecciona archivos mediante aserciones de texto/regex. Comprueba guards declarados, redirecciones internas, reglas y controles presentes en Apps Script, encabezados configurados, assets y ausencia de determinados bypasses HTML. No ejecuta reglas en un emulador ni demuestra por sí solo autorización efectiva. |
| `npm run build:prod` | Pasa. Inicial 851,90 kB; transferencia estimada 190,76 kB; chunk diferido de Firestore 340,81 kB. Persisten los avisos de presupuesto: inicial +101,90 kB y SCSS Home +2,92 kB. |
| `npm audit --omit=dev --json` | Finaliza con código 1 porque detecta 19 entradas de dependencias vulnerables: 10 moderadas, 9 altas y 0 críticas. No equivale a 19 fallos explotables distintos ni acredita ausencia de riesgo. |
| `npm test -- --watch=false --browsers=ChromeHeadless` | Bloqueada por el entorno: `ProcessSingleton ... socket() failed: Operation not permitted`. No se reportan tests Karma aprobados. El repositorio tiene un único `.spec.ts` con dos pruebas básicas de AppComponent. |
| Versión del entorno local | Node 24.22.1. El build observado no constituye una validación general de compatibilidad oficial de Angular 16 con Node 24. |
| Logs internos de Vercel | La consulta devuelve 403 por falta de acceso al equipo. Se pudo consultar el deployment y probar HTTP/UI públicos; no se afirma haber revisado logs internos. |

### Verificaciones reales de producción sobre el estado recuperado

- Home, listado, comunidades, login y registro responden HTTP 200. Además se verificó su UI; el código 200 de una SPA por sí solo no prueba el flujo.
- El logo WebP (12.388 bytes) y favicon PNG (7.529 bytes) responden 200 y coinciden por SHA-256 con sus archivos de `main`. Se observó el logo en la cabecera, pie y formularios.
- La API de partidas responde `health` con versión 8.0.0 y autenticación configurada, compatible con el cliente. El listado público devuelve una partida y no incluye campos `creador_email`, `telefono`, `whatsapp` ni `email`.
- La partida existente se muestra en Home, listado y detalle sin login, con 3/4 jugadores y un lugar disponible. El detalle carga comentarios vacíos y protege la identidad de participantes y los contactos.
- Buscar un texto sin coincidencias muestra cero resultados; restablecer los filtros recupera la tarjeta.
- Solicitar unirse sin sesión deriva a `/ingresar` conservando el detalle en `returnUrl`; el enlace al registro conserva ese destino. No se completó el login ni se afirma haber probado el retorno posterior a una autenticación exitosa.
- Acceder sin sesión a Jugadores o Crear partida deriva a login conservando la ruta solicitada.
- Comunidades termina de cargar y muestra el estado vacío previsto: no hay comunidades publicadas. No se cargaron datos ficticios.
- El menú de compartir abre y cierra. Copiar muestra `Enlace copiado`; la API de lectura del portapapeles de este navegador no expuso su contenido, por lo que no se certifica el pegado en otra aplicación. No se enviaron mensajes por WhatsApp.
- Se solicitaron las vistas previas reales con User-Agent de WhatsApp, Telegram y Discord: 200, Open Graph e imagen accesible, sin campos de contacto privado. Es una comprobación HTTP; no certifica el aspecto final dentro de esas aplicaciones ni sus cachés propias.
- Una partida inexistente devuelve 404 y un identificador inválido devuelve 400 en el endpoint de compartir.
- Una lectura privada `myGames` sin token devuelve `{ok:false}` y ningún dato. Apps Script responde HTTP 200 con error de aplicación; se comprobó el cuerpo, no sólo el estado HTTP.
- Los encabezados efectivos de producción incluyen CSP, `DENY`, `nosniff`, política de referencia, permisos restrictivos y `same-origin-allow-popups`.
- No se observaron errores propios de la aplicación en la consola de los flujos revisados; los errores recogidos pertenecían a la extensión del navegador de automatización.

### Incidencia comprobada y corrección mínima

**Problema:** el mismo enlace `/compartir/partida/:id` genera HTML para bots y una redirección para personas. El HTML del bot se publicaba con `public, s-maxage=300, stale-while-revalidate=1800`. Una petición posterior con User-Agent humano recibió **200, sin `Location`, con `X-Vercel-Cache: HIT`**, en lugar del 302 al detalle.

**Corrección:** `api/share-game.js` establece `Cache-Control: private, no-store` antes de elegir la respuesta, incluyendo 200, 302, 404 y 400. Se retiran las directivas de caché compartida del HTML. Se mantienen URL, contenido Open Graph, redirección, estados y comprobaciones de privacidad.

**Regresión:** se agregó la aserción de `no-store` antes de modificar el handler y falló con el encabezado anterior. Después de la corrección pasan ambas suites de `test:ci`, incluidas las respuestas de los tres bots y una petición humana posterior. El control final de CDN debe ejecutarse después de integrar/publicar el cambio, siguiendo el procedimiento de abajo; la evidencia del despliegue corresponde al PR correctivo.

**Impacto:** cada nueva petición del bot puede consultar Apps Script en lugar de reutilizar HTML desde la CDN. Los visitantes humanos siguen redirigiéndose sin esa consulta. No se modifican la caché del listado en el navegador ni los assets estáticos.

### Evaluación de las dependencias

| Grupo | Entradas del audit | Evaluación y decisión |
| --- | ---: | --- |
| Angular | 8: 4 altas y 4 moderadas | Hay avisos de XSS, XSRF, formateo y transferencia/hidratación. La aplicación no usa SSR/HttpTransferCache ni bypasses HTML detectados; los formatos de fecha observados son literales. Esto reduce algunas superficies, pero no elimina los avisos ni demuestra que todas sean inalcanzables. Mantener el plan de migración controlada. |
| Firebase y transitivas | 11: 5 altas y 6 moderadas | Incluyen `undici` 6.19.7 y `@grpc/grpc-js` 1.9.16. El audit propone Firebase 9.14.0, un downgrade mayor, que no se aplica. Hace falta evaluar alcance real por runtime y compatibilidad del SDK en una rama específica. |

El audit propone Angular 22.2.5 para varios paquetes; no se adopta como objetivo aprobado por este informe. No se actualizaron versiones ni se forzó el lockfile. Ningún aviso queda marcado como resuelto por la ausencia de un fallo visible.

### Pendientes para la aceptación integral

| Prioridad | Pendiente | Evidencia necesaria para cerrarlo |
| --- | --- | --- |
| Alta | Circuito con cuentas autorizadas de jugador y DM | Login Google/correo, registro/verificación, perfil obligatorio, sesión persistente, logout y recuperación de contraseña. El envío de verificación existe, pero actualmente no bloquea el acceso mediante guards. |
| Alta | Operaciones privadas de partidas | Crear/editar/pausar/cancelar, solicitar, aprobar/rechazar, cupos simultáneos, idempotencia, participantes y notificaciones, usando datos de prueba autorizados. |
| Alta | Privacidad efectiva en Firestore | Verificar propietario, tercero no autorizado y contacto habilitado tras aprobación; ejecutar reglas con emulador o cuentas de prueba. La revisión estática no sustituye estas pruebas. |
| Alta | Android y Safari iOS reales | Completar matriz visual de Home, menú, tarjetas, detalle, formularios y compartir; teclado virtual, scroll, orientación, safe areas, foco y Web Share API. La observación de escritorio de esta revisión no certifica dispositivos móviles. |
| Alta | Deuda de seguridad | Planificar migración por etapas y contrastar avisos/compatibilidad sin aplicar `audit fix --force`. |
| Media | Rendimiento | Resolver los dos presupuestos excedidos y medir en condiciones de red/dispositivo representativas. No se realizó una medición de Core Web Vitals en usuarios reales. |
| Media | Ejecución de Karma y registros de despliegue | Ejecutar en un entorno que permita Chromium y consultar los logs con acceso autorizado a Vercel. No modificar permisos para ocultar estas limitaciones. |

**Estado del cierre:** continuidad recuperada; código, compilación y flujos públicos revisados; una incidencia de caché reproducida y corregida con regresión automatizada. La Fase 4 conserva pendientes de aceptación integral. No corresponde declararla 100% aprobada para todos los flujos privados y dispositivos.

### Comprobación posterior a publicar una corrección de compartir

1. Consultar el `main` real y confirmar que Vercel sirve ese commit con estado `READY`.
2. En el mismo enlace de una partida pública, solicitar secuencialmente como bot WhatsApp, persona, bot Telegram y persona. Repetir sin agregar parámetros para eludir la caché.
3. Exigir HTML 200 + Open Graph para el bot y 302 + `Location` al detalle para la persona; todas las respuestas deben incluir `private, no-store`. No aceptar un HTML 200 servido como `HIT` a la persona.
4. Comprobar 404/400, imagen social accesible, ausencia de contactos privados y apertura del detalle en el navegador.
5. Registrar en el PR el commit/deployment y los resultados HTTP. Las cachés propias de WhatsApp/Telegram/Discord requieren validación adicional dentro de las aplicaciones.

### Contexto que debe conservarse

CUMBRE20 es un nexo para el rol existente en Mendoza. No se reconstruye ni se transforma en otra comunidad. Se conservan las fases anteriores, los enlaces públicos, el acceso con Firebase y la separación de contactos privados. Angular/Firebase se migrarán por separado, en una rama específica, comparando compatibilidad y validando cada etapa. Las instrucciones de mantenimiento del repositorio están en `AGENTS.md`.
