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
