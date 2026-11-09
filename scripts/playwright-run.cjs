const {spawn}=require('node:child_process');
const path=require('node:path');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators are required.');
const args=JSON.parse(process.env.CUMBRE20_PLAYWRIGHT_ARGS||'[]');
if(!Array.isArray(args)||args.some(arg=>typeof arg!=='string'))throw new Error('Invalid Playwright arguments');
const child=spawn(process.execPath,[path.resolve('node_modules/@playwright/test/cli.js'),'test',...args],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
