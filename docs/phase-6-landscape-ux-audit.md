# CUMBRE20 — Fase 6: auditoría UX y orientación horizontal

**Fecha de trabajo:** 9 de noviembre de 2026  
**Base:** \`main\` 780ebf4; **implementación:** PR #26, rama \`feature/cumbre20-mobile-redesign\`.  
**Alcance:** UI móvil exclusiva; Angular 22.2.5 / Firebase 13.2.0. No se tocaron auth, roles, Apps Script, Sheets, Firestore, sistemas de solicitud ni el diseño de escritorio.

## Evidencia y causa raíz

- **Captura aportada 1000789828.jpg, 1536×696 (teléfono horizontal):** muestra el hero y el encabezado de escritorio ampliados a escala de teléfono, con contenidos parcialmente visibles. **Causa comprobable en código:** \`src/mobile-redesign.scss\` solo aplicaba a \`max-width:767px\`; a 800–932 px, las reglas \`min-width:768px\` de Home, tarjetas y otros componentes reactivaban estructuras de tablet/escritorio. En teléfonos horizontales un viewport de 844 px no significa equipo de escritorio.
- **Captura aportada 1000789829.jpg, 696×1536 (teléfono vertical):** encabezado de “Aventuras abiertas” y tarjeta muy altos; etiqueta del sistema en columna lateral partida en muchas líneas. **Causa:** tarjetas con detalles en dos filas, arte estirado al alto de su contenido, sistema sobre la ilustración, padding/espaciados acumulados y título editorial de mucha presencia.
- **Cambios:** media query de celular horizontal con \`min-width:768px\`, \`max-width:1023px\`, \`max-height:500px\`, orientación apaisada, \`hover:none\` y \`pointer:coarse\`; variantes de Home, tarjeta, filtros, menú y compartir adaptadas al alto; sistema junto al título y etiquetas reducidas; cards sin \`h-full\` forzado.
- **Decisión y trade-off:** no usar User-Agent ni crear una segunda app. Los dispositivos táctiles tipo tablet que cumplan las condiciones también reciben ese layout (deseable en ancho compacto y altura baja). Los monitores/laptops con puntero fino no cambian. No se agrega navegación inferior fija porque resta alto útil en horizontal.
- **Vertical:** mantiene diseño de fantasía oscuro y tarjetas con ilustración lateral; no se quitan cupos, ubicación, modo, hora ni acceso a compartir. El sistema de rol usa etiqueta legible dentro del cuerpo.
- **Se preserva:** escenas de partidas, CTA al detalle, WhatsApp, Web Share, cuentas, perfil, publicación y enlaces públicos.
- **Pruebas físicas:** pendientes (Android Chrome e iPhone Safari con barras reales, teclado virtual, rotación y lectores de pantalla); las pruebas Playwright Chromium y WebKit no equivalen a un dispositivo físico.

## Auditoría de Nielsen, aplicada a evidencias reales

Severidad: 0 sin problema reproducido; 1 cosmético; 2 impacto moderado; 3 grave; 4 tarea bloqueada.

| Heurística | Evidencia/pantalla | Severidad | Causa / acción | Aceptación |
|---|---|---:|---|---|
| 1. Visibilidad del estado | Listados tienen estados de carga/activa/completa y cupos; no hay evidencia de fallo de feedback | 0 | Preservar estados de carga y etiquetas reales | CI con datos semilla y tests de solicitudes |
| 2. Coincidencia con mundo real | El rol se identifica con el sistema de mesa; en la captura el sistema estaba cortado en muchas líneas | 2 | Mover etiqueta al cuerpo de tarjeta, mostrar el sistema real | Texto legible sin recurrir a la imagen |
| 3. Control y libertad | Menú horizontal demasiado alto y hoja de compartir potencialmente fuera del viewport | 3 | Drawer scroll interno y cierre por Escape/fondo; compartir limitado por dvh | Abrir, recorrer y cerrar con 800×360/844×390/932×430 |
| 4. Consistencia | CSS móvil y de tablet compartían parcialmente reglas | 3 | Media query táctil horizontal única; variantes aisladas | Móvil coherente, captura de PC sin diferencias |
| 5. Prevención de errores | No se observó regresión validación de datos en capturas; backend fuera de alcance | 0 | No modificar lógica; probar flujos de autenticación y solicitudes | Tests de emuladores y E2E existentes |
| 6. Reconocer mejor que recordar | Header/hero sobresalían en horizontal y ocultaban acceso inmediato | 3 | Hero compacto, acciones visibles y menú accesible | CTA y apertura del menú en viewport horizontal |
| 7. Flexibilidad y eficiencia | Filtros existentes por ciudad/modo/nivel; no hay evidencia de funcionalidad faltante | 0 | Mantener formularios/atajos | Filtros funcionales en horizontal |
| 8. Estética minimalista | Encabezado “Aventuras abiertas” sobredimensionado y arte demasiado dominante | 2 | Jerarquía y separaciones medidas, imagen lateral más chica | Menor altura sin ocultar información relevante |
| 9. Recuperación de errores | Estados vacíos y mensajes de error ya existen; no hay evidencia de problema nuevo | 0 | Conservar errores y acciones de reintento, sin inventar partidas | Probar estado sin resultados y acceso |
| 10. Ayuda y documentación | Existe “Cómo funciona” y accesos para principiantes | 0 | Conservar rutas y CTAs | Página accesible desde móvil |

## Cold start y arquitectura de información

El estado sin partidas debe seguir mostrando cantidad real (cero), mensaje explícito y acciones existentes para explorar, crear perfil o publicar cuando el rol lo permite. No se simulan jugadores, partidas ni testimonios. Las rutas principales mantienen el orden:

- Jugador: buscar → detalle público → autenticarse si es necesario → solicitar.
- Máster: entrar → publicar → compartir → solicitudes/mis partidas.
- Principiante: “Cómo funciona” → explorar mesas → registro.
- Comunidad: Comunidades → solicitud de perfil → difusión en espacios externos.

Se prioriza reducir la altura del contenido y facilitar acceder a esas rutas sin duplicar menús o crear una red social.

## Matriz de QA automatizado

- \`tests/e2e/mobile-redesign.spec.ts\`: 320, 360, 375, 390, 393, 412 y 430 px en vertical, menús, tarjeta, compartir, formulario y rutas; aislamiento de escritorio a 768/1024/1440/1920.
- \`tests/e2e/mobile-landscape.spec.ts\`: 800×360, 844×390 y 932×430 en Chromium Android/WebKit iPhone emulados; Home, menús, partidas, compartir, registro y rotación con menú abierto. Control especial del viewport 932×430 no táctil para impedir alterar PC.
- \`tests/e2e/visual.spec.ts\`: snapshots base de tablet 768 y escritorio 1440 en tema claro/oscuro, sin regenerar.
- \`scripts/audit-browser.mjs\`: axe WCAG 2.2 AA en horizontales + vertical/tablet/escritorio y Lighthouse Home. Reporta puntuaciones y violaciones; no es validación de lector físico.
- Antes de fusionar: GitHub Actions verde en **el commit exacto**, Vercel Preview READY, revisión de capturas, comparación pixel-perfect PC y smoke test de producción después del merge. Si falla un check, mantener PR como borrador. Registrar limitaciones y no proclamar tests sin ejecución.

## Métricas y privacidad

No se inventan conversiones. El embudo por eventos agregados **a proponer antes de instrumentar**: \`home_view\`, \`search_submitted\`, \`search_no_results\`, \`game_detail_view\`, \`signup_started\`, \`profile_completed\`, \`game_create_started\`, \`game_published\`, \`join_request_started\`, \`join_request_submitted\`, \`share_clicked\`. Registrar únicamente categoría de evento, vista, breakpoint/orientación y marca temporal redondeada; evitar nombre, teléfono, email, Firebase UID, URL con token, títulos de partidas, IP en exportaciones, identificadores de contacto privados. Definir retención y consentimiento antes de agregar cualquier analítica.

Referencia de rendimiento anterior al cambio horizontal, no resultado de la nueva fase: en el artefacto \`performance-accessibility-visual\` del run 42682197377, 3 mediciones Lighthouse del candidato previo: performance 87/89/91, accesibilidad 100/100/100, LCP 3,71/3,24/3,19 s, CLS 0,058–0,060. Comparar con el pipeline del nuevo commit, sin sacar conclusiones sobre usuarios reales.
