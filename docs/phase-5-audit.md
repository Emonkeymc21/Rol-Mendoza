# Fase 5: arquitectura, rendimiento, SEO y UX

## Referencia y recuperación

Base comprobada el 9/11/2026: main `c733dd6694318d1b232272f383d52860805a4ec1`, PR #24 integrado, producción Vercel READY y mismo SHA. Angular 22.2.5, CLI/build 22.2.6, Firebase modular 13.2.0, TypeScript 6.0.3, Node 24. Lockfile inicial SHA256 `b08f39484f4f8563a564d8655707adfa7aedc09cefc8e69d82e50ecb49d8dc05`. Rama `codex/cumbre20-phase-5`. No cambios de datos, permisos ni Apps Script.

Recuperación: revertir el merge de esta fase en una rama y validar CI; si hay una incidencia urgente, promover el despliegue anterior `dpl_GKwtLT4xuMrKSmibgDY2ueZJELLH` en Vercel. No restaurar bases de datos: esta fase no las migra.

## Diagnóstico previo a cambios funcionales

| Hallazgo comprobado | Causa | Solución a validar | Criterio |
|---|---|---|---|
| Filtros no comparten estado completo; reset deja parámetros viejos | Formularios no escriben URL, queryParamMap sólo lee q/mode | Estado validado con Angular Router, emisión sin ciclos | Recarga, atrás/adelante, filtros completos, duplicados y acentos |
| Localidades con variantes no coinciden y pasan a Otro | Igualdad de strings sin normalización | Normalización y alias conservadores de la misma localidad | No mezclar departamentos; variantes y Otro probados |
| Home presenta fallo de partidas como cero resultados | No enlaza error; servicio guarda [] también al fallar | Separar éxito, carga y error; no cachear fallo | Fallo/reintento/cero real/caché válida |
| Perfiles vacíos durante carga y stream que termina tras error | Sin estados; catchError fuera del switchMap de auth | Estados y recuperación sin perder cambios de sesión | Error seguido de nueva sesión/carga |
| HTML inicial idéntico para Home/listado/detalle/comunidades/login | CSR puro y metadatos sólo cliente | Comparar renderizado público limitado con SSR completo | HTML sin JS, canonical y privacidad |
| robots bloquea /partidas y detalles | Disallow de prefijo público | Permitir páginas públicas y mantener privadas excluidas | HTTP robots/sitemap y rutas privadas |
| Bundle inicial 697,74 kB, transferencia estimada 175,94 kB | A medir por módulo y carga real | Sólo optimizaciones con comparación equivalente | Build y Lighthouse antes/después |
| Home SCSS 15,98 kB, presupuesto 13 kB | Estilos/component selectors | Reducir CSS real sin subir presupuesto | Build sin advertencia y capturas |

## Método de medición

Primera revisión de la rama añade únicamente herramientas: Lighthouse 13.6.0 y axe-core/Playwright 4.14.0, compilación optimizada con configuración Firebase demo, API Apps Script real ejecutada sobre Sheets en memoria, emuladores en loopback. No utiliza datos de producción. Tres navegaciones Lighthouse con condiciones móviles predeterminadas, todos los informes completos conservados en Actions. Capturas y axe de seis viewports, tema oscuro y Home claro. El laboratorio no sustituye INP/CWV p75 de usuarios reales ni dispositivos físicos. No se cambian condiciones para elevar puntuaciones.

En este entorno Chromium no puede crear su socket (Operation not permitted); las pruebas de navegador se ejecutan en runners compatibles de GitHub Actions. La compilación, pruebas de unidad, contratos y emuladores se ejecutan también localmente cuando sea posible.

Informe en curso: no implica aceptación ni publicación de los cambios funcionales.

## Cambios en validación

- URL de partidas y jugadores: todos los filtros definidos, debounce 250 ms, entradas de historial por cambio confirmado; lectura sin emitir eventos; la navegación atrás/adelante reemplaza cualquier valor pendiente. Valores desconocidos vuelven al valor por defecto; duplicados toman el primero. La búsqueda conserva acentos al compartir y normaliza sólo para comparar. Mixto sigue apareciendo en búsquedas presenciales/online, como antes.
- Localidades: case/acentos/espacios y dos alias históricos unívocos (Ciudad, Luján). No se agrupan departamentos ni se solicita geolocalización. Otro excluye localidades conocidas normalizadas y no cuenta una ciudad ausente como otra localidad.
- Partidas: fallo no emite ni persiste un [] ficticio; conserva la última respuesta válida sin renovar su timestamp. Detalle obtiene cupos frescos y comparte peticiones simultáneas. Fallo de transporte no se muestra como partida eliminada. Almacenamiento opcional protegido contra excepciones.
- Perfiles: estado de carga y error explícitos; el error de una sesión no termina la escucha global de cambios de autenticación. Home no sustituye una espera por cero perfiles.
- SSR híbrido oficial de Angular, manteniendo NgModules y guards. Home/listado/detalles/comunidades se renderizan anónimamente; cuatro páginas informativas se prerenderizan; autenticación, perfiles y operaciones privadas mantienen CSR y X-Robots-Tag noindex. Nunca se inicializa Auth en servidor. HttpTransferCache permite reutilizar sólo GET públicos al hidratar. Se desactiva la hidratación incremental predeterminada de Angular 22: no hay bloques diferidos, y la hidratación normal evita introducir scripts dinámicos de replay bajo la CSP estricta. No se añade unsafe-inline ni unsafe-eval a script-src. Prueba CSP ampliada a todos los HTML generados.
- Alternativas SEO: CSR sólo con metadatos no permite leer la página sin JS; sólo prerenderizar partidas deja fuera las recién publicadas; una plantilla HTML paralela duplica UI/contratos y provoca reemplazos visuales. SSR de rutas privadas añade riesgo sin beneficio de indexación. Se elige renderizado público con no-store, sin caché compartida ni credenciales Admin. Coste: ejecución Node y latencia del API Apps Script; medir y comunicar TTFB, sin prometer LCP de campo.
- Sitemap dinámico: sólo IDs válidos del listado público y páginas públicas fijas. Fallo upstream devuelve 503, nunca un sitemap falso. Compartir conserva handler y política private, no-store del PR #23.
- Auth modular pasa a chunk asíncrono conservando persistencia, API y guards. El análisis Lighthouse detectó ~209 kB sin utilizar en el chunk principal durante navegación pública. Las verificaciones deben incluir Google emulado y sesión recargada, además de login/registro y permisos.
- Axe base: contraste 4,02:1 en tres textos secundarios del Home claro; se usa el color secundario del tema, que debe superar 4,5:1.

### Línea base

Run Actions 42638518692 (commit de instrumentación 291374a): verify, Chromium, WebKit y audit aprobados. Lighthouse móvil sin compresión de servidor de laboratorio: Performance 73/73/74, Accessibility 96, Best Practices 100, SEO 100, LCP 6367/6328/6328 ms, CLS 0,0044/0,0044/0,0130, TBT 223/237/224 ms. Estas puntuaciones SEO **no demuestran indexación**: el HTML de producción sin JS estaba vacío. No se compararán esos valores sin compresión con valores comprimidos posteriores. La comparación final recompila el commit estable con el mismo compilador, usa el mismo servidor con gzip, y conserva ambos informes en un mismo runner.

Capturas base en el artefacto performance-accessibility-visual de ese run; doce recortes de viewport se conservan en tests/visual para regresión Playwright de Home (mismo Chromium/Ubuntu, ambas paletas). Tolerancia del 1% de píxeles; las diferencias se revisan, no se regeneran referencias para ocultar fallos. Se conservan también capturas completas antes/después de las seis rutas públicas.

Presupuesto Home: se ensayó ViewEncapsulation.None con ámbito app-home; aumentó CSS a 17,64 kB. Se descartó y restauró encapsulación original. No se elevan límites. El aviso original de 15,98/13 kB sigue pendiente de una reducción real que preserve el diseño.

### Ajuste tras verificar Vercel

El preview confirmó HTML completo en detalle y comunidades, pero la raíz estática de Vercel aún entregaba el shell CSR. Se cambia Home a prerender: contenido fijo completo, contadores desconocidos y skeleton honesto, con una única consulta real de actividad al hidratar. Las partidas no se congelan en el build. Esto elimina la dependencia de Apps Script del TTFB de la portada y evita coste de función en esa ruta. Listado y detalles conservan SSR actual por petición. Se comprobó búsqueda GUAYMALLEN, URL resultante y recarga desde Chrome en el preview, además de la apariencia y navegación al detalle.

Lighthouse detectó además WCAG 2.5.3 en la marca del encabezado: aria-label omitía parte del texto visible. Se elimina el aria-label redundante y se conserva el nombre nativo completo. Axe se amplía explícitamente a WCAG 2.1 A y 2.2 A, además de AA. Las tarjetas del listado usan h2; en Home conservan h3 bajo el h2 de su sección, sin cambiar apariencia.
