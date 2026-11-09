import {test} from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../api/sitemap.js';
function response(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(text){this.body=text;}};}
test('sitemap contains only public IDs and canonical public routes',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async url=>{assert.equal(url.searchParams.get('action'),'games');return {ok:true,json:async()=>({ok:true,data:[{partida_id:'PRT-PUBLIC',estado:'ACTIVE',creador_email:'secret@example.test'},{partida_id:'PRT-CANCELLED',estado:'CANCELLED'},{partida_id:'<script>',estado:'ACTIVE'}]})};};
  const res=response();await sitemap({},res);assert.equal(res.statusCode,200);assert.match(res.body,/<loc>https:\/\/rol-mendoza-2026.vercel.app\/partidas\/PRT-PUBLIC<\/loc>/);assert.match(res.body,/\/comunidades<\/loc>/);assert.doesNotMatch(res.body,/secret|CANCELLED|script|perfil|ingresar/);
 }finally{globalThis.fetch=original;}
});
test('sitemap upstream failure is retryable, not a successful empty index',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>{throw Error('offline');};const res=response();await sitemap({},res);assert.equal(res.statusCode,503);assert.equal(res.headers['retry-after'],'60');assert.doesNotMatch(res.body,/<urlset/);}finally{globalThis.fetch=original;}
});
