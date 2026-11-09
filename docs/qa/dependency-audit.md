# Auditoría de dependencias, Fase 4.1

Fecha: 2026-11-09. Base: `7e6a0039f4cf9413fa035ac1e65a29c4702ee02d`.

La auditoría de producción confirmó 19 paquetes afectados (10 moderados y 9 altos). La auditoría completa encontró 75 (7 bajos, 33 moderados, 32 altos y 3 críticos). Los recuentos son paquetes afectados, no cantidad de CVE distintos. Después de la migración ambas auditorías dan cero en todas las severidades.

El [inventario completo](dependency-advisories.json) conserva por paquete las rutas, versiones vulnerables instaladas, rango afectado, GHSA, severidad de cada aviso, corrección sugerida por npm, versiones finales y cadena transitiva. Una dependencia eliminada por el nuevo compilador no tiene versión final: su sustituto es `@angular/build@22.2.6` y Vitest. Los mínimos corregidos por aviso se consultan en sus GHSA; la tabla registra la solución efectivamente instalada, no presume un mínimo universal.

| Paquete | Tipo | Severidad | Alcance | Antes | Solución aplicada |
|---|---|---|---|---|---|
| @angular-devkit/architect | transitive | moderate | dev/CI | 0.1602.16 | 0.2202.6 |
| @angular-devkit/build-angular | direct | high | dev/CI | 16.2.16 | Eliminado al sustituir toolchain |
| @angular-devkit/build-webpack | transitive | moderate | dev/CI | 0.1602.16 | Eliminado al sustituir toolchain |
| @angular-devkit/core | transitive | moderate | dev/CI | 16.2.16 | 22.2.6 |
| @angular-devkit/schematics | transitive | moderate | dev/CI | 16.2.16 | 22.2.6 |
| @angular/animations | direct | moderate | producción | 16.2.12 | Eliminado al sustituir toolchain |
| @angular/cli | direct | high | dev/CI | 16.2.16 | 22.2.6 |
| @angular/common | direct | high | producción | 16.2.12 | 22.2.5 |
| @angular/compiler | direct | high | producción | 16.2.12 | 22.2.5 |
| @angular/compiler-cli | direct | moderate | dev/CI | 16.2.12 | 22.2.5 |
| @angular/core | direct | high | producción | 16.2.12 | 22.2.5 |
| @angular/forms | direct | moderate | producción | 16.2.12 | 22.2.5 |
| @angular/platform-browser | direct | moderate | producción | 16.2.12 | 22.2.5 |
| @angular/platform-browser-dynamic | direct | moderate | producción | 16.2.12 | Eliminado al sustituir toolchain |
| @angular/router | direct | high | producción | 16.2.12 | 22.2.5 |
| @babel/core | transitive | low | dev/CI | 7.22.9, 7.23.2 | 8.0.1, 8.0.5 |
| @babel/runtime | transitive | moderate | dev/CI | 7.22.6 | Eliminado al sustituir toolchain |
| @firebase/auth | transitive | moderate | producción | 1.7.9 | 1.13.9 |
| @firebase/auth-compat | transitive | moderate | producción | 0.5.14 | 0.6.14 |
| @firebase/firestore | transitive | high | producción | 4.7.3 | 4.19.1 |
| @firebase/firestore-compat | transitive | high | producción | 0.3.38 | 0.4.17 |
| @firebase/functions | transitive | moderate | producción | 0.11.8 | 0.14.0 |
| @firebase/functions-compat | transitive | moderate | producción | 0.3.14 | 0.5.0 |
| @firebase/storage | transitive | moderate | producción | 0.13.2 | 0.14.6 |
| @firebase/storage-compat | transitive | moderate | producción | 0.3.12 | 0.4.6 |
| @grpc/grpc-js | transitive | high | producción | 1.9.16 | 1.14.7 |
| @ngtools/webpack | transitive | moderate | dev/CI | 16.2.16 | Eliminado al sustituir toolchain |
| @npmcli/run-script | transitive | high | dev/CI | 6.0.2 | Eliminado al sustituir toolchain |
| @schematics/angular | transitive | moderate | dev/CI | 16.2.16 | 22.2.6 |
| @sigstore/sign | transitive | high | dev/CI | 1.0.0 | Eliminado al sustituir toolchain |
| @sigstore/tuf | transitive | moderate | dev/CI | 1.0.3 | Eliminado al sustituir toolchain |
| @tootallnate/once | transitive | low | dev/CI | 1.1.2, 2.0.1 | Eliminado al sustituir toolchain |
| @tufjs/models | transitive | moderate | dev/CI | 1.0.4 | Eliminado al sustituir toolchain |
| ajv | transitive | moderate | dev/CI | 6.15.0, 8.12.0, 8.20.0 | 8.20.0 |
| body-parser | transitive | high | dev/CI | 1.20.8 | 1.20.9, 2.4.0 |
| cacache | transitive | high | dev/CI | 16.1.3, 17.1.4 | Eliminado al sustituir toolchain |
| copy-webpack-plugin | transitive | moderate | dev/CI | 11.0.0 | Eliminado al sustituir toolchain |
| esbuild | transitive | moderate | dev/CI | 0.18.17 | 0.28.2 |
| external-editor | transitive | low | dev/CI | 3.1.0 | Eliminado al sustituir toolchain |
| fast-uri | transitive | moderate | dev/CI | 3.1.8 | 3.1.9 |
| firebase | direct | high | producción | 10.14.1 | 13.2.0 |
| follow-redirects | transitive | high | dev/CI | 1.16.0 | Eliminado al sustituir toolchain |
| glob | transitive | moderate | dev/CI | 10.5.0, 7.2.3, 8.1.0 | 14.0.4 |
| http-proxy-agent | transitive | low | dev/CI | 4.0.1, 5.0.0 | 7.0.2 |
| ignore-walk | transitive | moderate | dev/CI | 6.0.5 | Eliminado al sustituir toolchain |
| inquirer | transitive | low | dev/CI | 8.2.4 | Eliminado al sustituir toolchain |
| ip-address | transitive | moderate | dev/CI | 10.7.2 | 10.7.6 |
| jsdom | transitive | low | dev/CI | 16.7.0 | 31.0.0 |
| launch-editor | transitive | high | dev/CI | 2.14.1 | Eliminado al sustituir toolchain |
| make-fetch-happen | transitive | high | dev/CI | 10.2.1, 11.1.1 | Eliminado al sustituir toolchain |
| minimatch | transitive | moderate | dev/CI | 3.1.5, 5.1.9, 9.0.9 | 11.0.5, 3.1.5, 5.1.9, 6.2.3 |
| node-forge | transitive | high | dev/CI | 1.4.0 | Eliminado al sustituir toolchain |
| node-gyp | transitive | high | dev/CI | 9.4.1 | 13.1.0 |
| npm-registry-fetch | transitive | high | dev/CI | 14.0.5 | Eliminado al sustituir toolchain |
| pacote | transitive | high | dev/CI | 15.2.0 | Eliminado al sustituir toolchain |
| picomatch | transitive | high | dev/CI | 2.3.1, 4.0.7 | 2.3.2, 4.0.7 |
| piscina | transitive | critical | dev/CI | 4.0.0 | 5.3.2 |
| postcss | transitive | high | dev/CI | 8.4.31, 8.5.28 | 8.5.32 |
| postcss-selector-parser | transitive | moderate | dev/CI | 6.1.4, 7.1.6 | 6.1.6 |
| qs | transitive | moderate | dev/CI | 6.16.0 | 6.16.2 |
| read-package-json | transitive | moderate | dev/CI | 6.0.4 | Eliminado al sustituir toolchain |
| serialize-javascript | transitive | high | dev/CI | 6.0.2 | Eliminado al sustituir toolchain |
| shell-quote | transitive | critical | dev/CI | 1.10.0 | Eliminado al sustituir toolchain |
| sigstore | transitive | high | dev/CI | 1.9.0 | Eliminado al sustituir toolchain |
| sockjs | transitive | moderate | dev/CI | 0.3.24 | Eliminado al sustituir toolchain |
| source-map-js | transitive | high | dev/CI | 1.2.1 | 1.2.2 |
| tar | transitive | critical | dev/CI | 6.2.1 | 7.5.22 |
| tmp | transitive | high | dev/CI | 0.0.33, 0.2.7 | 0.2.7 |
| tuf-js | transitive | high | dev/CI | 1.1.7 | Eliminado al sustituir toolchain |
| undici | transitive | high | producción | 6.19.7 | 6.29.1, 8.12.4 |
| uuid | transitive | moderate | dev/CI | 8.3.2 | 11.1.1 |
| vite | transitive | high | dev/CI | 4.5.5 | 8.3.5 |
| webpack | transitive | low | dev/CI | 5.94.0 | Eliminado al sustituir toolchain |
| webpack-dev-middleware | transitive | high | dev/CI | 5.3.4, 6.1.2 | Eliminado al sustituir toolchain |
| webpack-dev-server | transitive | high | dev/CI | 4.15.1 | Eliminado al sustituir toolchain |

## Resoluciones transitivas analizadas

- `@grpc/grpc-js`: override 1.14.7 dentro de la misma versión mayor; Firebase conserva un rango antiguo. Cubre GHSA-m9gg-hp2v-232j y GHSA-f596-whhp-79r4. Verificado con Firestore emulado y el SDK modular en cada etapa.
- `glob`: sólo rangos vulnerables >=9 <14.0.2 pasan a 14.0.4. La línea 7 permanece intacta por compatibilidad. Conserva exportaciones CommonJS utilizadas por las herramientas; CLI, compilación y emuladores comprobados.
- `uuid`: sólo <11.1.1 se lleva a 11.1.1, que conserva CommonJS. No se impone la versión ESM 14 a consumidores antiguos.
- `@google-cloud/pubsub`: 6.3.2 para Firebase CLI. Actualiza su padre de OpenTelemetry a una cadena mantenida. Se descartó forzar sólo OpenTelemetry porque generaba un árbol npm inválido. `npm ls --all` y los emuladores pasan con el padre actualizado.
- `undici`: `npm update undici` dentro de los rangos originales resolvió los avisos restantes de Firebase CLI.

No se usó `npm audit fix --force`, audit-level, exclusiones ni supresión de avisos. Los overrides son resoluciones efectivas de paquetes y deben reevaluarse al actualizar sus padres. Las pruebas verifican el alcance usado por Cumbre20; no aseguran todas las funciones opcionales de Firebase CLI.

Las fuentes primarias son las versiones oficiales npm, el resultado del registro de seguridad y los avisos GHSA enlazados en el inventario. El resultado es una fotografía del registro en la fecha indicada.
