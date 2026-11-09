const {spawn}=require('node:child_process');
const path=require('node:path');
const child=spawn(process.execPath,[path.resolve('node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:exec','--config','firebase.test.json','--only','auth,firestore','--project','demo-cumbre20','--non-interactive','node scripts/playwright-run.cjs'],{stdio:'inherit',env:{...process.env,CUMBRE20_PLAYWRIGHT_ARGS:JSON.stringify(process.argv.slice(2))}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
