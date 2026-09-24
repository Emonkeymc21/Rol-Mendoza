# Cumbre20

Aplicación responsive en Angular 16 para conectar jugadores, Dungeon Masters y partidas de rol en Mendoza.

Identidad pública: **Cumbre20 — Encontrá tu próxima mesa.** Los nombres técnicos del proyecto Firebase, el repositorio y la planilla se mantienen para no interrumpir integraciones existentes.

## Flujo actual

1. Registro con correo/contraseña o Google mediante Firebase Authentication.
2. Verificación automática del perfil en Firestore.
3. Onboarding obligatorio de cuatro pasos cuando faltan datos.
4. Acceso a jugadores, partidas y herramientas de la comunidad.
5. Contacto externo mediante WhatsApp o Instagram, con permisos por rol y bloqueo.

No se utiliza Google Forms ni existe chat interno.

## Funcionalidades

- Perfil público en `users/{uid}` sin datos sensibles.
- Contacto privado en `userPrivate/{uid}`.
- WhatsApp normalizado al formato argentino `549 + código de área + número`.
- Instagram normalizado a un username limpio.
- Contactos privados y visibles únicamente entre el jugador y el DM después de aceptar una solicitud; el rol `DM` o `BOTH` por sí solo no concede acceso.
- Bloqueo reversible que oculta mutuamente los perfiles en la aplicación y protege los contactos en Firestore.
- Matching por ciudad, sistemas, modalidad y frecuencia.
- Migración progresiva: un usuario anterior sin `profileCompleted` vuelve al onboarding.
- Partidas publicadas automáticamente mediante una API de Apps Script y Google Sheets.
- Menú de usuario con perfil, edición, preferencias, partidas propias y cierre de sesión.
- Creación restringida a roles `DM` y `BOTH`, validada también en el backend.
- Edición, pausa, activación y cancelación de partidas por su propietario.
- Solicitudes únicas para unirse a partidas, con estado pendiente, vista, aceptada o no aceptada.
- Aceptación con cupo real e idempotente: participante en Firestore y contador sincronizado en Sheets.
- Al aceptar, se habilita contacto recíproco entre DM y jugador; WhatsApp abre con un mensaje contextual de la partida e Instagram abre el perfil indicado.
- Notificaciones internas en tiempo real y contador de novedades sin reintroducir chat.
- Doce emblemas de clase propios de Cumbre20; las fotos personales de proveedores no se muestran ni se copian a perfiles nuevos.
- Tema del sistema, claro u oscuro, persistido localmente y aplicado antes de iniciar Angular.
- Diseño mobile-first para PC, Android, iPhone y tablets.
- Configuración SPA lista para Vercel.

## Identidad visual

- `src/assets/cumbre20-logo.svg`: marca compacta Mendoza + d20 usada en navbar y favicon.
- `src/assets/mendoza-silhouette-reference.png`: referencia original aportada para conservar la forma real de la provincia y facilitar una futura vectorización definitiva.
- La combinación actual usa carbón, bordó, dorado apagado y crema mediante tokens CSS para los temas claro y oscuro.

## Requisitos

- Node.js 18.13 o superior.
- npm 9 o superior.

## Instalar y ejecutar

```bash
npm install
npm start
```

Abrí `http://localhost:4200`.

## Firebase

En Firebase Console habilitá:

- Authentication → Email/Password.
- Authentication → Google.
- Firestore Database.

Después desplegá las reglas incluidas:

```bash
npm install -g firebase-tools
firebase.cmd login
firebase.cmd use rol-mendoza
firebase.cmd deploy --only firestore:rules,firestore:indexes
```

En PowerShell se usa `firebase.cmd` para evitar que una política local bloquee el wrapper `firebase.ps1`.

Las reglas aplican seguridad real en el backend. Ocultar botones en Angular no se utiliza como mecanismo de protección.

### Estructura de perfiles

```text
users/{uid}                         perfil público y preferencias
userPrivate/{uid}                   WhatsApp, Instagram y consentimiento
users/{uid}/blockedUsers/{uid}      personas bloqueadas
users/{uid}/blockedBy/{uid}         espejo privado para ocultamiento mutuo
gameJoinRequests/{requestId}        relación segura entre jugador, partida y DM
gameParticipants/{idDeterminístico} participantes confirmados por partida y jugador
contactGrants/{uid}/viewers/{uid}      acceso de contacto entre integrantes aceptados
users/{uid}/notifications/{id}      notificaciones privadas del usuario
```

`userPrivate` no admite consultas de lista. Un tercero sólo puede leer un documento concreto si Apps Script creó un permiso recíproco en `contactGrants` después de aceptar una solicitud. El rol `DM` o `BOTH` por sí solo no permite ver contactos. También deben existir consentimiento vigente, perfiles completos y ausencia de bloqueo en ambas direcciones.

Los documentos antiguos del chat quedan completamente denegados por las reglas. Si la colección remota `conversations` no contiene información necesaria, puede eliminarse manualmente desde Firebase Console.

## Perfiles anteriores

No hace falta ejecutar una migración masiva. Cuando un usuario existente inicia sesión:

- si falta `profileCompleted` o algún campo requerido, se lo dirige a `/completar-perfil`;
- al guardar, su documento anterior se adapta al modelo nuevo;
- las rutas principales permanecen bloqueadas hasta terminar.

## Apps Script y Sheets

Firestore es la fuente principal para autenticación, perfiles, búsquedas, contactos, permisos y bloqueos.

Google Sheets es la fuente de datos de partidas y comentarios. Firestore almacena solicitudes, participantes y notificaciones. El backend de `google-apps-script/` valida la propiedad y el cupo, registra al participante con un ID determinístico y sincroniza `currentPlayers` con Sheets.

Flujo de partidas:

```text
Angular → Firebase ID Token → Apps Script → Google Sheets
```

El navegador no contiene credenciales privadas de Google. Apps Script se ejecuta como el propietario de la hoja, valida el token de Firebase, comprueba el rol para crear y verifica `creador_uid` para modificar. Por esta arquitectura no hacen falta Service Accounts ni variables privadas adicionales en Vercel.

Para actualizarlo:

1. Copiá `google-apps-script/Code.gs` y `appsscript.json` al proyecto existente.
2. Ejecutá `autorizarServiciosCumbre20` desde el editor y aceptá los permisos solicitados.
3. Ejecutá una vez `migrarContactosAceptadosCumbre20` para habilitar el contacto en aceptaciones anteriores.
4. Editá el deployment existente y publicá una **Nueva versión**.
5. Conservá la misma URL `/exec` configurada en los environments.
6. Verificá que `?action=health` devuelva `version: 8.0.0`.

`UrlFetchApp` es necesario: valida el Firebase ID Token contra Identity Toolkit, consulta el perfil de Firestore y crea solicitudes/notificaciones en Firestore. No existe una llamada HTTP del script hacia sí mismo. El manifiesto solicita únicamente Sheets, `script.external_request` y `datastore`.

La pestaña `PARTIDAS` ya está preparada con los campos adicionales, estados `ACTIVE`, `PAUSED`, `FULL`, `CANCELLED` y publicación inmediata al guardarse.

## Compilar producción

```bash
npm run build:prod
```

El resultado queda en `dist/rol-mendoza`.

## GitHub y Vercel

```bash
git init
git add .
git commit -m "Perfiles Firebase, contactos privados y bloqueo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/rol-mendoza.git
git push -u origin main
```

En Vercel:

- Build command: `npm run build:prod`
- Output directory: `dist/rol-mendoza`

`vercel.json` contiene el rewrite necesario para Angular. Agregá el dominio final en Firebase Authentication → Settings → Authorized domains.

## Estructura principal

```text
src/app/
├── core/
│   ├── data/
│   ├── guards/
│   ├── models/
│   └── services/
├── pages/
│   ├── complete-profile/
│   ├── account/
│   ├── login/
│   ├── register/
│   ├── players/
│   ├── games/
│   ├── my-games/
│   └── ...
└── shared/components/
```

Cada componente mantiene separados sus archivos `.ts`, `.html` y `.scss`.
