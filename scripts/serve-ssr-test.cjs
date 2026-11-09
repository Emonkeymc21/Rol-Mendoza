const {spawn}=require('node:child_process');
const config=require('../vercel.json');
const production=config.headers.find(rule=>rule.source==='/(.*)').headers.find(h=>h.key==='Content-Security-Policy').value;
// Only this demo process allows loopback emulator connections; shipped CSP stays strict.
const csp=production.replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:8080").replace("frame-src 'self'", "frame-src 'self' http://127.0.0.1:9099").replace('; upgrade-insecure-requests','');
const child=spawn(process.execPath,['dist/ssr-test/server/server.mjs'],{stdio:'inherit',env:{...process.env,CUMBRE20_TEST_MODE:'1',CUMBRE20_TEST_CSP:csp}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??1));
