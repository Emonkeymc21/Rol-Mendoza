# CUMBRE20: cierre verificable del diseño móvil

Revisión del 15/11/2026. Fuente de verdad: GitHub y Vercel, no el resumen del chat.

## Estado recuperado

- PR #26 integrado el 9/11 a las 21:12 de Argentina; `main` **79928ffd9c9a2c8e2486864cb34367cd3bc8418b**.
- Vercel producción **dpl_77Z4efT1H5vAtyktqrQ5g2NNCwiJ**, READY; alias `rol-mendoza-2026.vercel.app`, mismo SHA.
- Angular 22.2.5, CLI/build 22.2.6, Firebase modular 13.2.0, TypeScript 6.0.3, Node 24.22.1 en esta revisión. El rediseño ya estaba implementado: no se reconstruye.
- Se abrió el sitio público y se recorrieron Home, listado, detalle real y compartir/cerrar. Las dos partidas reales aparecen; no se crearon registros en producción. Sin errores/fatales/warnings en los logs disponibles del deployment durante la ventana de 30 minutos de esta revisión; esto no acredita ausencia histórica de errores.

## Evidencia recuperada del código publicado

Run [42726569904](https://github.com/Emonkeymc21/Rol-Mendoza/actions/runs/42726569904), exacto `79928ff`, todos sus jobs aprobados:

| Verificación | Resultado |
|---|---|
| Instalación limpia, árbol, audit completo y producción | Aprobados; auditorías 0 en esa ejecución |
| Build producción/CSP | Aprobados; 12 scripts inline autorizados por SHA-256 exacto |
| Unitarias | 40 aprobadas |
| Emuladores | 30 aprobadas: 14 reglas reales, 11 Apps Script, 3 Auth, 2 sitemap |
| Chromium | 30 aprobadas; 14 omisiones explícitas por proyecto/alcance |
| WebKit macOS | 23 aprobadas; 21 omisiones explícitas por proyecto/anchos de muestra |
| Axe/overflow público | 108 combinaciones; 0 violaciones y 0 desbordamientos en candidato |
| Regresión visual anterior | Home 768/1440, dos temas, tolerancia previa 1%; no equivale a todos los píxeles de todas las pantallas |

Las omisiones no se cuentan como pruebas aprobadas. Se descargaron y revisaron los artefactos originales: capturas reales y resultados JSON. Las cuentas son emuladas.

## Falta detectada y corrección de QA

El documento anterior seguía diciendo «pendiente» y la comparación de escritorio sólo cubría Home 768/1440 con tolerancia 1%. Las capturas a 1024/1920 y la ausencia de media query activa no prueban por sí solas igualdad visual.

Se agrega `scripts/build-mobile-baseline.cjs` que recompila **780ebf445a24dd8d557abcf8baeceb14c994b248**, anterior al rediseño, con el mismo compiler y configuración demo. `scripts/mobile-closeout.mjs` sirve ambos builds alternativamente en el mismo origen, con cuentas/datos persistentes iguales, fuentes, zona horaria, tema y escala 1.

Compara RGBA píxel por píxel sin máscaras, umbral ni tolerancia de antialiasing a **768/1024/1440/1920**, en ambos temas y motores. Captura todas las pantallas públicas y privadas principales, menú, compartir y onboarding; los cambios intencionales de 390 px se guardan como antes/después. El foco de esta ampliación es verificar y documentar, sin introducir nuevas bibliotecas ni cambiar contratos.

La matriz móvil existente conserva 320/360/375/390/393/412/430 y añade orientación horizontal táctil 800/844/932. WebKit anterior sólo tomó 320/390/430; no se presenta como cobertura de cada ancho ni como iPhone físico.

El nuevo cierre se ejecuta en CI junto a los flujos originales; un fallo de píxeles en escritorio, excepción real, permisos, build/CSP o reglas impide aprobar. El clasificador estricto WebKit existente y su control negativo se conservan.

## Rendimiento: alcance de las mediciones

El run histórico anterior compara **c733dd6**, anterior a Fase 5, con el móvil actual. Sus medianas de 3 mediciones: Performance 75→84, LCP 3746→3193 ms, TBT 556→347 ms, CLS 0,0130→0,0122. No es una comparación exclusiva del rediseño móvil, ni métricas de usuarios reales. Performance 90 y LCP 2,5 s no se alcanzan.

La ampliación mide ambos builds contra **780ebf4** en el mismo runner/gzip, con tres Lighthouse móviles por variante, sin alterar el throttling predeterminado. Las capturas usan movimiento reducido para reproducibilidad; Lighthouse conserva condiciones normales. Publicar resultados reales del run al completar, sin asumir mejora.

Build publicado: inicial **674,28 kB**, transferencia estimada **170,32 kB**. Persiste Home SCSS 15,98 kB frente a aviso 13 kB. No se elevaron presupuestos.

## Límites y recuperación

No se probaron dispositivos físicos, VoiceOver/TalkBack, teclado virtual real, barras dinámicas reales ni Google OAuth/correos con usuarios reales. La automatización de motores y Auth Emulator cubre la lógica restante. Continuar con `docs/qa/physical-device-checklist.md`.

No se modifican usuarios, Firestore, permisos, Apps Script/Sheets ni dependencias de producción. Rollback visual: revertir PR #26 y desplegar `780ebf4`; no requiere migración de datos. Para revertir este cierre (PR #27), recuperar `79928ff`; incluye sus correcciones puntuales de menú, foco y etiqueta accesible, además de pruebas/documentación. No requiere cambios de datos.

## Correcciones incrementales de cierre

- La hoja móvil de compartir tenía aspecto modal, pero no contenía el foco ni bloqueaba el scroll del documento. Se limita el foco a sus acciones, con Tab/Shift+Tab/flechas/Home/End; Escape/cierre devuelven el foco al disparador. CSS `:has()` bloquea el fondo únicamente en la query móvil y baja el header debajo del scrim. La prueba E2E comprueba foco, retorno y rueda sin desplazamiento del fondo.
- Se limita el traslado del drawer fuera del header a la query móvil. En el breakpoint de tablet/PC se conserva el padre original del commit anterior al rediseño. Esto evita que un cambio de contexto de pintura afecte píxeles del menú en PC. No se duplican las rutas ni el contenido: un solo `ng-template` se inserta en el padre correspondiente al abrir/rotar.
- Se agrega una comprobación automatizada **de sólo lectura** del dominio público en ambos motores, 320/390/1440, Home/listado/login/registro/comunidades, menú y compartir un detalle real. Registra estilos activos, `ng-version`, capturas y excepciones. No inicia sesión ni envía formularios o datos ficticios a producción.

Los resultados nuevos se acreditarán con los jobs/artefactos finales. El primer intento de la nueva matriz se detuvo por una expectativa incorrecta de la fixture (`Luna` frente a `luna`, derivado del email por el contrato de Apps Script); se corrigió la prueba, no la aplicación ni el contrato. El siguiente intento también verificó que el guard conserva `returnUrl` al enviar una cuenta incompleta al onboarding; la expectativa se ajustó a esa URL completa ya implementada.

El intento WebKit del run 43749826048 aprobó los recorridos y la nueva contención de foco, pero se detuvo en tres anchos porque su protocolo móvil no implementa `mouse.wheel`. Se usa PageDown real del navegador en ambos motores y, adicionalmente, rueda en Chromium. Se conserva la aserción de scroll sin desplazamiento, estilos de bloqueo y foco; no se reemplaza por una omisión del caso. Un gesto físico de arrastre de Safari queda en el checklist físico.

Se amplía además WebKit a los siete anchos verticales: 320/360/375/390/393/412/430. Se elimina la omisión anterior de cuatro anchos, manteniendo todas las aserciones. Con la comparación nueva de 768/1024/1440/1920, ambos motores cubren los once anchos solicitados.

Para Lighthouse se omite únicamente el banner visual de diagnóstico de Auth Emulator, idénticamente en ambas variantes mediante el proxy de laboratorio. Ese overlay no existe en producción y puede alterar CLS/LCP. No se cambia el SDK, no se ocultan errores de consola ni excepciones y no se alteran throttling, CPU, viewport o contenido de la aplicación. Los resultados previos que lo incluían se conservan como históricos, sin mezclarlos con la comparación corregida.

La comparación completa de Chromium encontró seis diferencias limitadas al texto nativo del selector de modalidad del Home (1024/1440/1920, dos temas): 752–892 píxeles, exactamente un desplazamiento vertical de 1 px; bordes, icono, geometría y todas las demás pantallas coincidían. Los estilos globales activos fuera de media queries son idénticos (salvo declaración de charset). Se refuerzan precondiciones: stylesheet activo, fuentes Inter/Cinzel cargadas, misma opción del selector inicializada sin cambiar su valor y dos capturas consecutivas idénticas. Se registran fuente, padding, apariencia y geometría del selector para investigar cualquier diferencia restante. No se enmascaran controles ni se elevan tolerancias.

La auditoría autenticada detectó `label-content-name-mismatch` en la campana móvil: mostraba un contador que faltaba en el nombre accesible. Se agrega ese mismo contador (incluido `99+`) al nombre accesible, sin modificar su apariencia ni las consultas de notificaciones.

El smoke público corre como job independiente en cada motor. En `push` a main recompila producción y espera que el HTML público anuncie el mismo bootstrap `main-<hash>.js` antes de capturar. Esto permite detectar un alias viejo o un despliegue que no corresponde al código validado, sin tokens ni escrituras de datos. En PR sólo verifica el sitio público actual, sin confundirlo con el preview del candidato. El deployment SHA se contrasta además mediante Vercel.

WebKit confirmó una limitación adicional de `fullPage`: para capturar cambia temporalmente el viewport al ancho útil sin scrollbar (768→757), activa la media query móvil y cambia la altura de Home. Se reemplaza esa técnica por capturas reales de viewport fijo en tramos sucesivos de scroll, en ambos motores. No se unen, recortan ni enmascaran imágenes. Se compara también la altura total del documento y se conserva la barra nativa. Se verifica que la media query de ancho siga coincidiendo con el ancho solicitado. Se retira la inicialización del selector: las capturas no modifican sus valores ni disparan eventos de formulario.

El smoke público registra `innerWidth`, ancho útil, viewport visual, escala y media query. En emulación móvil `innerWidth` puede diferir por decoraciones fijas recortadas; no se usa como sustituto del ancho utilizable. Se exige que el body quepa en el ancho útil, que ningún control visible quede fuera y que no exista desplazamiento horizontal real, igual que la prueba móvil existente. En escritorio se admite únicamente el gutter nativo de 11 px definido por el CSS original. Los diagnósticos y capturas se conservan también al fallar.

Se bloquea también `html` al abrir el drawer: bloquear sólo `body` no asegura el fondo cuando la raíz ya tiene `overflow-x:hidden`. La prueba usa PageDown con el disparador enfocado y exige que el scroll del documento no cambie. Se conserva el scroll interno del menú. Las capturas del recorrido funcional se toman a viewport fijo y esperan URL/carga real de edición antes de fotografiar, para evitar capturar en plena navegación.

El trace del run 43753421267 mostró la llegada de `Player Aislada` al listado confirmado entre las fases action/after del toque en Editar. El tap terminó sobre el fondo y la URL siguió en Mis partidas. No hubo una excepción de aplicación. El recorrido ahora verifica la llegada del perfil aceptado antes de editar y la URL/valor cargado después; no amplía timeouts ni omite edición. Ese control también acredita la sincronización observable posterior a la aprobación.

El smoke público exige stylesheet activo y fuentes listas en cada navegación, también en el detalle, y conserva una traza por viewport incluso si falla. Esperar sólo un H1 SSR visible no acredita que el CSS diferido esté aplicado; esa era una precondición ausente del primer smoke Chromium del run 43755550936. Se captura el detalle antes de interactuar para conservar evidencia del estado real, sin reintentar el click ni cambiar la aplicación.

El run 43756012063 corrigió una hipótesis del diagnóstico anterior: en WebKit macOS el gutter nativo también reduce el ancho de las media queries con `fullPage:false`. Una ventana 768 deja 757 CSS y activa legítimamente `max-width:767px`; no corresponde compararla como escritorio 768 CSS. Se calibra el viewport exterior para alcanzar el ancho CSS solicitado, mediante búsqueda de media query y únicamente compensando hasta 11 px de gutter nativo. Se conserva la barra en la imagen (por ejemplo 779 px totales para 768 CSS); ambos builds reciben la misma condición. Se registra cada ancho útil, exterior y de media query en `viewports.jsonl`, se rechaza una desviación mayor o desconocida y se sigue exigiendo cero píxeles distintos. No se modifica el CSS de la aplicación, no se recortan imágenes y Lighthouse Chromium conserva sus condiciones originales.

La primera comparación calibrada de WebKit redujo la diferencia de Home a 1.259 píxeles exclusivamente dentro del logo (44×44); el resto del viewport coincidió exactamente. El asset no cambió en Git. El candidato había cargado primero el logo en tamaño móvil y luego se había redimensionado al ancho final; La hipótesis que se verifica es un bitmap reescalado retenido por WebKit. Después de calibrar se recarga el documento a su viewport final, en ambos builds, antes de iniciar las capturas. Se conservan el logo completo y la comparación exacta, y se registran su recurso, tamaño natural y geometría. No se cambia la imagen ni el CSS de la aplicación.

La recarga posterior al resize no estabilizó la métrica de WebKit. Se cambia la preparación para abrir la página desde el inicio con el gutter nativo compensado; si una ruta no tiene scrollbar, se ajusta en `about:blank` y se carga un documento nuevo. No se redimensiona una imagen viva de la aplicación. Se registra cada intento de ancho, no sólo el resultado, para conservar el diagnóstico completo. La aceptación continúa pendiente de la comparación exacta final.
