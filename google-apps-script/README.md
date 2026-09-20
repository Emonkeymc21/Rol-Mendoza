# Backend de partidas de Rol Mendoza

Apps Script se utiliza únicamente para partidas, solicitudes, comentarios y moderación en Google Sheets. Los perfiles, permisos, contactos y bloqueos pertenecen a Firestore.

## Base conectada

- [Rol Mendoza - Partidas](https://docs.google.com/spreadsheets/d/1ZtbK4j_V8ePbUgaZZkeTtP7vFcnjsn2R7s2brRtvw9k/edit)

## Endpoints

Lecturas públicas:

- `GET ?action=health`
- `GET ?action=games`
- `GET ?action=comments&gameId=...`

Escrituras autenticadas:

- `POST createGame`
- `POST joinGame`
- `POST createComment`

Cada POST incluye un Firebase ID token. Apps Script valida el token antes de escribir y obtiene desde Firebase el UID y el nombre del autor. No necesita una hoja de cuentas.

## Publicar

1. Abrí el proyecto actual de Apps Script.
2. Reemplazá `Code.gs` y `appsscript.json` con los archivos de esta carpeta.
3. Guardá los cambios.
4. Elegí **Implementar → Administrar implementaciones**.
5. Editá la implementación web y elegí **Nueva versión**.
6. Mantené **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona**.
7. Implementá. La URL `/exec` seguirá siendo la misma.

## Verificación

Abrí:

```text
TU_URL_EXEC?action=health
```

La respuesta debe indicar la versión `4.0.0` y `auth: configured`.

## Moderación

En la pestaña `PARTIDAS`:

- Las nuevas partidas ingresan como `Borrador` y `publicada = No`.
- Para mostrarlas, cambiá `estado` a `Abierta` y `publicada` a `Sí`.
- `Completa` puede seguir visible, pero deja de aceptar solicitudes.

Las solicitudes se registran en `SOLICITUDES` y los comentarios en `COMENTARIOS`.

## Seguridad

- Firebase administra las credenciales.
- Cada escritura valida el ID token.
- El cliente no elige su propio UID ni nombre de autor.
- Los textos se sanitizan y se evita la inyección de fórmulas.
- Se aplica bloqueo de concurrencia y limitación básica por usuario.
- Ningún dato de WhatsApp o Instagram circula por Apps Script o Sheets.
