const {spawn}=require('node:child_process');
const path=require('node:path');
// Never reuse the developer/production configuration for browser QA.
const child=spawn(process.execPath,[path.resolve('node_modules/@angular/cli/bin/ng.js'),'serve','--configuration=e2e','--proxy-config=tests/proxy.e2e.json','--host=127.0.0.1','--port=4200'],{stdio:'inherit',env:{...process.env,PORT:'4200'}});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
