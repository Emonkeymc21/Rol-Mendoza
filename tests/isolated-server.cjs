const http = require('node:http');
const { createAppsScript, PROJECT_ID } = require('./helpers/apps-script.cjs');
const { URL } = require('node:url');
if (process.env.CUMBRE20_TEST_MODE !== '1' || PROJECT_ID !== 'demo-cumbre20') throw new Error('The isolated server is test-only.');
process.env.APPS_SCRIPT_WEB_APP_URL = 'http://127.0.0.1:4401/apps-script';
const share = require('../api/share-game.js');
let api = createAppsScript();
const send = (res, code, body) => { res.statusCode=code; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); };
const body = req => new Promise((resolve,reject) => {let raw=''; req.on('data',chunk=>{raw+=chunk; if(raw.length>100000){reject(new Error('Payload too large'));req.destroy();}});req.on('end',()=>resolve(raw));req.on('error',reject);});
const server=http.createServer(async (req,res) => {
  try {
    const url=new URL(req.url,'http://127.0.0.1:4401');
    if(url.pathname==='/health') return send(res,200,{ok:true,projectId:PROJECT_ID});
    if(url.pathname==='/reset'&&req.method==='POST') {
      for(const target of [`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`]) {
        const result=await fetch(target,{method:'DELETE'});if(!result.ok)throw new Error('Unable to reset demo emulators.');
      }
      api=createAppsScript();return send(res,200,{ok:true});
    }
    if(url.pathname==='/advance-cache-clock'&&req.method==='POST') {
      api.advanceCacheTime(4000);return send(res,200,{ok:true});
    }
    if(url.pathname==='/apps-script') {
      const result=req.method==='POST' ? api.post(JSON.parse(await body(req))) : api.get(Object.fromEntries(url.searchParams));
      return send(res,200,result);
    }
    if(url.pathname.startsWith('/compartir/partida/')) {
      req.query={gameId:decodeURIComponent(url.pathname.slice('/compartir/partida/'.length))};
      req.headers['x-forwarded-proto']='http';
      return await share(req,res);
    }
    return send(res,404,{error:'Unknown isolated test route'});
  } catch(error) { return send(res,500,{error:error.message}); }
});
server.listen(4401,'127.0.0.1',()=>console.log('Isolated Cumbre20 API ready on loopback, demo project only.'));
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.close(()=>process.exit(0)));
