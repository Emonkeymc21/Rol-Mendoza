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
- Contactos visibles únicamente para usuarios autenticados con rol `DM` o `BOTH`.
- Bloqueo reversible que oculta mutuamente los perfiles en la aplicación y protege los contactos en Firestore.
- Matching por ciudad, sistemas, modalidad y frecuencia.
- Migración progresiva: un usuario anterior sin `profileCompleted` vuelve al onboarding.
- Partidas publicadas automáticamente mediante una API de Apps Script y Google Sheets.
- Menú de usuario con perfil, edición, preferencias, partidas propias y cierre de sesión.
- Creación restringida a roles `DM` y `BOTH`, validada también en el backend.
- Edición, pausa, activación y cancelación de partidas por su propietario.
- Diseño mobile-first para PC, Android, iPhone y tablets.
- Configuración SPA lista para Vercel.

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
```

`userPrivate` no admite consultas de lista. Un tercero solo puede leer un documento concreto si posee un perfil completo con rol `DM` o `BOTH`, existe consentimiento y no hay bloqueo en ninguna dirección.

Los documentos antiguos del chat quedan completamente denegados por las reglas. Si la colección remota `conversations` no contiene información necesaria, puede eliminarse manualmente desde Firebase Console.

## Perfiles anteriores

No hace falta ejecutar una migración masiva. Cuando un usuario existente inicia sesión:

- si falta `profileCompleted` o algún campo requerido, se lo dirige a `/completar-perfil`;
- al guardar, su documento anterior se adapta al modelo nuevo;
- las rutas principales permanecen bloqueadas hasta terminar.

## Apps Script y Sheets

Firestore es la fuente principal para autenticación, perfiles, búsquedas, contactos, permisos y bloqueos.

Google Sheets es la fuente de datos de partidas, solicitudes y comentarios. El backend está en `google-apps-script/` y no consulta hojas de perfiles o cuentas.

Flujo de partidas:

```text
Angular → Firebase ID Token → Apps Script → Google Sheets
```

El navegador no contiene credenciales privadas de Google. Apps Script se ejecuta como el propietario de la hoja, valida el token de Firebase, comprueba el rol para crear y verifica `creador_uid` para modificar. Por esta arquitectura no hacen falta Service Accounts ni variables privadas adicionales en Vercel.

Para actualizarlo:

1. Copiá `google-apps-script/Code.gs` y `appsscript.json` al proyecto existente.
2. Ejecutá `autorizarServiciosCumbre20` desde el editor y aceptá los permisos solicitados.
3. Editá el deployment existente y publicá una **Nueva versión**.
4. Conservá la misma URL `/exec` configurada en los environments.
5. Verificá que `?action=health` devuelva `version: 5.0.0`.

`UrlFetchApp` es necesario: valida el Firebase ID Token contra Identity Toolkit y consulta el perfil de Firestore para confirmar el rol DM/BOTH. No existe una llamada HTTP del script hacia sí mismo. El manifiesto sólo solicita los scopes de Sheets y `script.external_request`.

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
