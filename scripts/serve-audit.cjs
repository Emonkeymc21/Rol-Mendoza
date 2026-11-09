// Production-optimized browser build, isolated API and Firebase demo only.
const http=require('node:http'), fs=require('node:fs'), path=require('node:path');
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Demo emulators required');
const root=path.resolve(process.env.CUMBRE20_AUDIT_ROOT || 'dist/audit');
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4200');
 if(url.pathname==='/apps-script'||url.pathname.startsWith('/compartir/')){
   const r=await fetch('http://127.0.0.1:4401'+req.url,{method:req.method,headers:{'user-agent':req.headers['user-agent']||''},redirect:'manual'});
   res.writeHead(r.status,Object.fromEntries(r.headers));return res.end(Buffer.from(await r.arrayBuffer()));
 }
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(root,'index.html');
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 const bytes=fs.readFileSync(file);
 if(/gzip/.test(req.headers['accept-encoding']||'')){res.setHeader('Content-Encoding','gzip');res.end(require('node:zlib').gzipSync(bytes));}else res.end(bytes);
}).listen(4200,'127.0.0.1');
