# Verificación física pendiente

Los proyectos Android Chromium e iPhone WebKit de Playwright emulan tamaño, touch y agente de usuario; no son dispositivos físicos ni prueban el teclado del sistema. El Google ID token del Auth emulator no certifica OAuth real.

Registrar dispositivo/modelo, Android/iOS, versión Chrome/Safari, fecha, commit/deployment y resultado de cada paso. Usar cuentas autorizadas. Hacer pruebas que escriben datos en un entorno de prueba separado; no crear fixtures en producción.

- [ ] Google OAuth real: abrir popup, elegir cuenta autorizada, volver a la partida original y completar perfil si corresponde. Probar cancelación, popup bloqueado y reintento.
- [ ] Email real: registro, enlace de verificación y recuperación; conservar usuarios existentes. No registrar contraseñas o tokens en el informe.
- [ ] Persistencia: cerrar la pestaña/navegador, reabrir; bloquear/desbloquear pantalla; renovar sesión sin repetir perfil.
- [ ] Home y menú: 320/360/390/430 px, vertical y horizontal, barra del navegador expandida/contraída. Sin texto cortado ni scroll horizontal.
- [ ] Safe areas: notch/Dynamic Island y barra inferior. Menú y compartir accesibles al pie de la pantalla.
- [ ] Formulario de registro y cuatro pasos de perfil: teclados email/teléfono, foco visible, botón de continuar accesible, volver conserva datos.
- [ ] Publicación/edición DM: fecha/hora nativas, selects, texto largo, validación de cupos y botones al abrir/cerrar teclado.
- [ ] Jugador: buscar/filtrar, detalle público, solicitar. DM: recibir, aprobar/rechazar, comprobar cupos y permisos de contacto.
- [ ] Compartir: bottom sheet, cerrar tocando afuera, copiar, menú nativo, WhatsApp. Comprobar enlace desde otra aplicación y regreso tras login.
- [ ] Temas claro/oscuro/sistema, aumentar tamaño de fuente y reducir movimiento. Comprobar contraste y campos autocompletados.
- [ ] Red móvil/Wi-Fi: carga inicial, recarga de URL profunda, interrupción/reintento sin duplicar solicitudes ni partidas.
- [ ] Registrar errores de consola/red del preview y los logs de producción con acceso autorizado. Diferenciar un rechazo esperado de permisos de un error inesperado.

No marcar estos puntos como aprobados por el resultado de Vitest, Node SDK o Playwright.
