# Backend de partidas de Cumbre20

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
- `POST resolveJoinRequest`
- `POST createComment`

Cada POST incluye un Firebase ID token. Apps Script valida el token antes de escribir y obtiene desde Firebase el UID y el nombre del autor. No necesita una hoja de cuentas.

La API usa un sobre de acciones porque los Web Apps de Apps Script exponen `doGet` y `doPost`. El frontend centraliza este contrato en `GoogleAppsScriptService`; los componentes nunca construyen requests por su cuenta. Antes de cada grupo de operaciones se comprueba que la versión publicada sea `8.0.0`, evitando crear datos contra un backend antiguo y fallar después al intentar listarlos.

La hoja conserva nombres `snake_case` como `partida_id` y `creador_uid`. El adaptador del frontend los convierte al modelo Angular en `camelCase`, por lo que existe una sola traducción y no se mezclan convenciones dentro de los componentes.

## Publicar

1. Abrí el proyecto actual de Apps Script.
2. Reemplazá `Code.gs` y `appsscript.json` con los archivos de esta carpeta.
3. Guardá los cambios.
4. Elegí **Implementar → Administrar implementaciones**.
5. Editá la implementación web y elegí **Nueva versión**.
6. Mantené **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona**.
7. Implementá. La URL `/exec` seguirá siendo la misma.

## Autorizar Sheets, solicitudes externas y Firestore

La API valida el Firebase ID Token y los roles mediante servicios de Google. También crea de forma atómica la solicitud y la primera notificación en Firestore. Por eso necesita los scopes de Sheets, `script.external_request` y `datastore` declarados en `appsscript.json`.

1. En Apps Script abrí **Configuración del proyecto** y activá **Mostrar el archivo de manifiesto `appsscript.json` en el editor**.
2. Confirmá que el manifiesto del editor coincide con el archivo de esta carpeta.
3. Volvé al editor, elegí `autorizarServiciosCumbre20` en el selector de funciones y presioná **Ejecutar**.
4. Elegí tu cuenta, revisá los permisos y presioná **Permitir**.
5. Elegí `migrarContactosAceptadosCumbre20` y ejecutala una vez para habilitar contacto en solicitudes que ya estaban aceptadas.
6. Editá el deployment existente y seleccioná **Nueva versión**. No crees otro deployment: así la URL `/exec` no cambia.

La autorización se realiza con la cuenta propietaria del deployment. No expone tokens ni credenciales en el navegador.

## Verificación

Abrí:

```text
TU_URL_EXEC?action=health
```

La respuesta debe indicar la versión `8.0.0` y `auth: configured`.

## Publicación y estados

En la pestaña `PARTIDAS`:

- Las nuevas partidas se guardan con `estado = ACTIVE` y `publicada = Sí`.
- Las partidas nuevas quedan disponibles para la comunidad en cuanto se guardan.
- `PAUSED` y `CANCELLED` dejan de mostrarse públicamente.
- `FULL` permanece visible, pero deja de aceptar solicitudes.
- Editar o cambiar el estado exige que el UID autenticado coincida con `creador_uid`.

Las solicitudes y notificaciones se registran en Firestore. La pestaña histórica `SOLICITUDES` ya no es necesaria para el flujo nuevo; las partidas continúan en `PARTIDAS` y los comentarios en `COMENTARIOS`.

Al aceptar una solicitud, Apps Script bloquea la operación, comprueba que siga pendiente y que exista cupo, crea `gameParticipants/{idDeterminístico}`, incrementa `jugadores_actuales`, recalcula `cupos_libres` y marca `FULL` al completar la mesa. En el mismo commit crea permisos recíprocos en `contactGrants` para que DM y jugador puedan coordinar por WhatsApp o Instagram. Repetir la aceptación no vuelve a sumar un lugar.

## Seguridad

- Firebase administra las credenciales.
- Cada escritura valida el Firebase ID token.
- Crear una partida comprueba en Firestore que el perfil tenga rol `DM` o `BOTH`.
- Solicitar unirse comprueba en Firestore que el perfil tenga rol `PLAYER` o `BOTH`.
- El `dmUid` se obtiene de `creador_uid` en la partida; el navegador no puede elegirlo.
- Editar, pausar o cancelar comprueba la propiedad en el servidor.
- El cliente no elige su propio UID ni nombre de autor.
- Los textos se sanitizan y se evita la inyección de fórmulas.
- Se aplica bloqueo de concurrencia y limitación básica por usuario.
- Ningún dato de WhatsApp o Instagram circula por Apps Script o Sheets.


## Portadas de campañas

La API conserva la versión 8.0.0. El listado y el detalle devuelven solamente
la referencia de la portada. La edición autorizada devuelve también una vista
previa liviana. Los bytes públicos pasan por `/api/game-cover` y cada lectura
comprueba la visibilidad de la campaña y la referencia vigente.

El optimizador de Vercel valida el archivo por contenido, aplica la
orientación de la foto y lo convierte a dos WebP sin metadatos. Los límites son
4 MiB de entrada, 25 megapíxeles, 27 KiB para la tarjeta y 105 KiB para el
encabezado. La portada y los datos de la partida se guardan en una sola fila.
Cancelar antes del guardado deja la portada anterior intacta. Reemplazar o
quitar sobrescribe los bytes de esa fila, por lo que no hay objetos huérfanos.

Se eligió la hoja existente para mantener el control de visibilidad y el
guardado en la misma operación, sin provisionar otro servicio. Los bytes se
reparten en celdas de menos de 50.000 caracteres y quedan fuera de las
lecturas de listado. Firebase Storage requiere Blaze y el bucket configurado
devolvió 404. Un Blob privado requeriría provisionar almacenamiento, guardar su
referencia aparte y coordinar la limpieza y la autorización entre servicios.
La solución actual hace una consulta a Apps Script por cada imagen visible.
Si aumenta el volumen, medir latencia y cuotas antes de reconsiderar el almacenamiento.

### Activación

1. En un Apps Script de prueba y su hoja aislada, configurar una propiedad de
   script `CUMBRE20_COVER_KEY` con un secreto aleatorio de 32 bytes o más.
   Usar el mismo valor en Preview de Vercel y apuntar las operaciones de esa
   compilación al Web App de prueba. Usar un secreto independiente en producción.
2. Actualizar `Code.gs`, ejecutar `configurarPortadasCumbre20` con la cuenta
   propietaria y publicar una nueva versión del Web App. El paso agrega cinco
   columnas contiguas al final de PARTIDAS. Mantener esas columnas al final.
   No se necesitan permisos OAuth nuevos ni cambios en Firestore.
3. Confirmar que `GET ?action=health` devuelve `gameCovers: true`. Probar en
   el preview el alta, una recarga anónima, reemplazo, eliminación y pausa.
4. Repetir el despliegue de Apps Script y la configuración de la variable
   `CUMBRE20_COVER_KEY` en producción. Usar el deployment Web App existente
   para mantener su URL pública. Confirmar el SHA de Vercel después de integrar.

Para desactivar temporalmente las nuevas cargas, retirar la variable de Vercel
y volver a desplegar. Las portadas guardadas se pueden seguir leyendo desde
la versión de Apps Script que entiende su referencia. Mantener sus columnas
para conservar los datos al revertir el frontend.
