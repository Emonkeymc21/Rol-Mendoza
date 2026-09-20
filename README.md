# Rol Mendoza

Aplicación responsive en Angular 16 para conectar jugadores, Dungeon Masters y partidas de rol en Mendoza.

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
- Partidas moderadas mediante Apps Script y Google Sheets.
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
firebase login
firebase use rol-mendoza
firebase deploy --only firestore
```

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

Google Sheets se conserva solamente para partidas, solicitudes, comentarios y moderación. El backend está en `google-apps-script/` y ya no consulta hojas de perfiles o cuentas.

Para actualizarlo:

1. Copiá `google-apps-script/Code.gs` y `appsscript.json` al proyecto existente.
2. Publicá una nueva versión de la aplicación web.
3. Conservá la misma URL `/exec` configurada en los environments.

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
│   └── ...
└── shared/components/
```

Cada componente mantiene separados sus archivos `.ts`, `.html` y `.scss`.
