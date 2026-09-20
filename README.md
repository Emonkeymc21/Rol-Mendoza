# Rol Mendoza

Sitio responsive para conectar jugadores, másters y partidas de rol en Mendoza y alrededores. Está construido con Angular 16, TypeScript, SCSS y Tailwind CSS.

## Funcionalidades incluidas

- Inicio con buscador de partidas y personas.
- Listado de jugadores y másters con filtros por rol, modalidad y zona.
- Perfiles individuales.
- Listado de partidas con filtros por sistema, modalidad, frecuencia y experiencia.
- Detalle de cada partida, lugares libres y acuerdos de mesa.
- Formulario para crear partidas conectado a Apps Script y con moderación previa.
- Flujo de registro preparado para abrir Google Forms.
- Perfiles y partidas públicas leídos desde Google Sheets sin exponer la hoja completa.
- Solicitudes para sumarse y comentarios moderados por partida.
- D20 interactivo, menú móvil, estados vacíos y página 404.
- Diseño mobile-first para Android, iPhone, tablets y escritorio.
- Configuración de rutas SPA para Vercel.

## Requisitos

- Node.js 18.13 o superior. Para Angular 16 se recomienda Node.js 18 LTS.
- npm 9 o superior.

## Instalar y ejecutar

```bash
npm install
npm start
```

Abrí `http://localhost:4200`.

## Compilar producción

```bash
npm run build:prod
```

El resultado queda en `dist/rol-mendoza`.

## Google Forms conectado

El formulario público de registro ya está configurado en estos dos archivos:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Se usa la URL limpia terminada en `/viewform`, sin datos de ejemplo precargados. Cuando existan formularios separados para sumarse a una mesa o publicar una partida, completá:

```ts
googleForms: {
  registrationUrl: 'ENLACE_PUBLICO_DE_REGISTRO_YA_CONFIGURADO',
  joinGameUrl: 'ENLACE_PUBLICO_PARA_SUMARSE',
  createGameUrl: 'ENLACE_PUBLICO_PARA_PUBLICAR'
}
```

## Conectar Google Sheets y Apps Script

El backend completo está en `google-apps-script/`. Seguí su `README.md` para copiar el código, desplegar la aplicación web y obtener la URL `/exec`.

Después pegá esa URL en `appsScript.webAppUrl` dentro de:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Si la URL queda vacía, el proyecto conserva datos de demostración y guarda las partidas creadas localmente. Cuando la URL está configurada, usa la base moderada de Sheets.

## Subir a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Proyecto inicial de Rol Mendoza"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/rol-mendoza.git
git push -u origin main
```

## Publicar en Vercel

1. En Vercel elegí **Add New → Project**.
2. Importá el repositorio de GitHub.
3. Vercel detectará Angular y leerá `vercel.json`.
4. Confirmá:
   - Build command: `npm run build:prod`
   - Output directory: `dist/rol-mendoza`
5. Presioná **Deploy**.

El `rewrite` incluido hace que las rutas como `/partidas` y `/jugadores/valen-d20` funcionen también al recargar la página.

## Estructura principal

```text
src/app/
├── core/
│   ├── models/
│   └── services/
├── pages/
│   ├── home/
│   ├── players/
│   ├── player-detail/
│   ├── games/
│   ├── game-detail/
│   ├── create-game/
│   ├── register/
│   ├── how-it-works/
│   └── not-found/
└── shared/components/
    ├── header/
    ├── footer/
    ├── icon/
    ├── player-card/
    ├── game-card/
    └── dice-roller/

google-apps-script/
├── Code.gs
├── appsscript.json
└── README.md
```

Cada componente mantiene separados sus archivos `.ts`, `.html` y `.scss`.
