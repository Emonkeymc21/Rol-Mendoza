# Backend de partidas de Rol Mendoza

Apps Script se utiliza como API segura para las partidas almacenadas en Google Sheets. Los perfiles, permisos, contactos y bloqueos pertenecen a Firestore.

## Base conectada

- [Rol Mendoza - Partidas](https://docs.google.com/spreadsheets/d/1ZtbK4j_V8ePbUgaZZkeTtP7vFcnjsn2R7s2brRtvw9k/edit)

## Endpoints

Lecturas públicas:

- `GET ?action=health`
- `GET ?action=games`
- `GET ?action=game&gameId=...`
- `GET ?action=comments&gameId=...`

Escrituras autenticadas:

- `POST createGame`
- `POST myGames`
- `POST ownedGame`
- `POST updateGame`
- `POST setGameStatus`
- `POST deleteGame` (cancelación lógica)
- `POST joinGame`
- `POST createComment`

Cada POST incluye un Firebase ID token. Apps Script valida el token antes de escribir y obtiene desde Firebase el UID y el nombre del autor. No necesita una hoja de cuentas.

La API usa un sobre de acciones porque los Web Apps de Apps Script exponen `doGet` y `doPost`. El frontend centraliza este contrato en `GoogleAppsScriptService`; los componentes nunca construyen requests por su cuenta. Antes de cada grupo de operaciones se comprueba que la versión publicada sea `5.0.0`, evitando crear datos contra un backend antiguo y fallar después al intentar listarlos.

La hoja conserva nombres `snake_case` como `partida_id` y `creador_uid`. El adaptador del frontend los convierte al modelo Angular en `camelCase`, por lo que existe una sola traducción y no se mezclan convenciones dentro de los componentes.

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

La respuesta debe indicar la versión `5.0.0` y `auth: configured`.

## Publicación y estados

En la pestaña `PARTIDAS`:

- Las nuevas partidas se guardan con `estado = ACTIVE` y `publicada = Sí`.
- Las partidas nuevas quedan disponibles para la comunidad en cuanto se guardan.
- `PAUSED` y `CANCELLED` dejan de mostrarse públicamente.
- `FULL` permanece visible, pero deja de aceptar solicitudes.
- Editar o cambiar el estado exige que el UID autenticado coincida con `creador_uid`.

Las solicitudes se registran en `SOLICITUDES` y los comentarios en `COMENTARIOS`.

## Seguridad

- Firebase administra las credenciales.
- Cada escritura valida el Firebase ID token.
- Crear una partida comprueba en Firestore que el perfil tenga rol `DM` o `BOTH`.
- Editar, pausar o cancelar comprueba la propiedad en el servidor.
- El cliente no elige su propio UID ni nombre de autor.
- Los textos se sanitizan y se evita la inyección de fórmulas.
- Se aplica bloqueo de concurrencia y limitación básica por usuario.
- Ningún dato de WhatsApp o Instagram circula por Apps Script o Sheets.
