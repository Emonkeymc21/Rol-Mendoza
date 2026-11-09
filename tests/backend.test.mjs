import { before, beforeEach, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, query, where, terminate } from 'firebase/firestore';
import { saveProfile } from './helpers/fixtures.mjs';
const {createAppsScript,PROJECT_ID}=createRequire(import.meta.url)('./helpers/apps-script.cjs');
const actors={}; let api;
const gameInput={title:'Aventura aislada de prueba',system:'Fate',location:'A coordinar',city:'Guaymallén',mode:'Presencial',schedule:'Sábado 18:00',frequency:'One-shot',totalSeats:4,currentPlayers:0,level:'Principiantes bienvenidos',tone:'Aventura',summary:'Una aventura ficticia para comprobar solicitudes, cupos y permisos sin utilizar datos de producción.',safety:'Acuerdos previos de mesa'};
before(async () => {
  for(const [name,role] of [['dm','DM'],['player','PLAYER'],['other','PLAYER']]) {
    const app=initializeApp({projectId:PROJECT_ID,apiKey:'emulator-only-key',authDomain:`${PROJECT_ID}.firebaseapp.com`},`${name}-${randomUUID()}`);
    const auth=getAuth(app); connectAuthEmulator(auth,'http://127.0.0.1:9099');
    const {user}=await createUserWithEmailAndPassword(auth,`${name}-${randomUUID()}@example.test`,'Only-an-emulator-123!');
    const database=getFirestore(app); connectFirestoreEmulator(database,'127.0.0.1',8080);
    await saveProfile(database,user.uid,role);
    actors[name]={app,auth,database,uid:user.uid,token:await user.getIdToken()};
  }
});
beforeEach(async () => {
  const cleared=await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,{method:'DELETE'});
  assert.equal(cleared.ok,true);
  for(const [name,a] of Object.entries(actors)) await saveProfile(a.database,a.uid,name==='dm'?'DM':'PLAYER');
  api=createAppsScript({seed:false});
});
after(async () => {for(const a of Object.values(actors)){await signOut(a.auth);await terminate(a.database);await deleteApp(a.app);}});
const post=(who,action,payload={})=>api.post({apiVersion:'8.0.0',action,payload,idToken:actors[who]?.token||''});
function createGame(extra={}) {const result=post('dm','createGame',{...gameInput,...extra});assert.equal(result.ok,true,JSON.stringify(result));return result.data.id;}
function request(who,gameId){const result=post(who,'joinGame',{gameId,message:'Quiero participar en esta prueba aislada.'});assert.equal(result.ok,true,JSON.stringify(result));return result.data.id;}
function resolve(requestId,status='APPROVED'){const result=post('dm','resolveJoinRequest',{requestId,status});assert.equal(result.ok,true,JSON.stringify(result));return result.data;}

describe('actual Apps Script business logic with emulated Auth/Firestore and in-memory Sheets', {concurrency:false}, () => {
  it('enforces the status rate limit and permits reopening after its cooldown', () => {
    const id=createGame();
    assert.equal(post('dm','setGameStatus',{gameId:id,status:'PAUSED'}).ok,true);
    const rapid=post('dm','setGameStatus',{gameId:id,status:'ACTIVE'});
    assert.equal(rapid.ok,false);assert.match(rapid.error,/Esperá unos segundos/);
    api.advanceCacheTime(4000);
    assert.equal(post('dm','setGameStatus',{gameId:id,status:'ACTIVE'}).ok,true);
    assert.equal(api.get({action:'game',gameId:id}).data.estado,'ACTIVE');
  });

  it('keeps API 8.0.0 and denies unauthenticated or player-only publication', () => {
    assert.equal(api.get({action:'health'}).data.version,'8.0.0');
    assert.equal(post('', 'createGame',gameInput).ok,false);
    assert.equal(post('player','createGame',gameInput).ok,false);
    assert.equal(api.get({action:'games'}).data.length,0);
  });
  it('publishes, filters public data and rejects editing by another owner', () => {
    const id=createGame();const data=api.get({action:'game',gameId:id}).data;
    assert.equal(data.cupos_libres,4);assert.equal(data.estado,'ACTIVE');
    assert.equal('creador_email' in data,false);
    assert.equal(post('player','updateGame',{...gameInput,id}).ok,false);
    assert.equal(post('dm','updateGame',{...gameInput,id,title:'Aventura actualizada'}).ok,true);
    assert.equal(api.get({action:'game',gameId:id}).data.titulo,'Aventura actualizada');
  });
  it('creates a pending request once and notifies the DM', async () => {
    const gameId=createGame(),id=request('player',gameId);
    api.advanceCacheTime(30_000);
    assert.equal(post('player','joinGame',{gameId}).data.duplicate,true);
    const snapshot=await getDoc(doc(actors.dm.database,'gameJoinRequests',id));
    assert.equal(snapshot.data().status,'PENDING');
    assert.ok((await getDocs(collection(actors.dm.database,`users/${actors.dm.uid}/notifications`))).size>0);
  });
  it('approves once, increments one seat and enables only the approved contact pair', async () => {
    const gameId=createGame(),id=request('player',gameId);
    await assert.rejects(getDoc(doc(actors.player.database,'userPrivate',actors.dm.uid)));
    assert.equal(resolve(id).currentPlayers,1);
    api.advanceCacheTime(3_000);
    assert.equal(resolve(id).duplicate,true);
    assert.equal(api.get({action:'game',gameId}).data.jugadores_actuales,1);
    assert.ok((await getDoc(doc(actors.player.database,'userPrivate',actors.dm.uid))).exists());
    await assert.rejects(getDoc(doc(actors.other.database,'userPrivate',actors.dm.uid)));
  });
  it('rejects a request without consuming seats or granting contact', async () => {
    const gameId=createGame(),id=request('other',gameId);
    assert.equal(resolve(id,'REJECTED').status,'REJECTED');
    assert.equal(api.get({action:'game',gameId}).data.cupos_libres,4);
    await assert.rejects(getDoc(doc(actors.other.database,'userPrivate',actors.dm.uid)));
  });
  it('prevents another player from resolving a request', () => {
    const gameId=createGame(),id=request('player',gameId);
    assert.equal(post('other','resolveJoinRequest',{requestId:id,status:'APPROVED'}).ok,false);
    assert.equal(api.get({action:'game',gameId}).data.jugadores_actuales,0);
  });
  it('fills the last seat and rejects a later approval without overbooking', () => {
    const gameId=createGame({totalSeats:2,currentPlayers:1});
    const first=request('player',gameId),second=request('other',gameId);
    assert.equal(resolve(first).gameStatus,'FULL');
    api.advanceCacheTime(3_000);
    assert.equal(post('dm','resolveJoinRequest',{requestId:second,status:'APPROVED'}).ok,false);
    const game=api.get({action:'game',gameId}).data;
    assert.equal(game.cupos_libres,0);assert.equal(game.jugadores_actuales,2);
  });
  it('compensates Sheets when the Firestore commit fails', () => {
    const gameId=createGame(),id=request('player',gameId);
    api.failNextCommit();
    assert.equal(post('dm','resolveJoinRequest',{requestId:id,status:'APPROVED'}).ok,false);
    const game=api.get({action:'game',gameId}).data;
    assert.equal(game.cupos_libres,4);assert.equal(game.jugadores_actuales,0);
  });
  it('removes a confirmed participant and restores the seat', async () => {
    const gameId=createGame(),id=request('player',gameId);resolve(id);
    const result=post('dm','removeParticipant',{gameId,playerUid:actors.player.uid});
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(result.data.availableSeats,4);
    const participants=await getDocs(query(collection(actors.player.database,'gameParticipants'),where('gameId','==',gameId)));
    assert.equal(participants.size,0);
  });
  it('pauses/reopens/cancels with owner checks and excludes private games from public reads', () => {
    const gameId=createGame();
    assert.equal(post('player','setGameStatus',{gameId,status:'PAUSED'}).ok,false);
    assert.equal(post('dm','setGameStatus',{gameId,status:'PAUSED'}).ok,true);
    assert.equal(api.get({action:'game',gameId}).ok,false);
    api.advanceCacheTime(4_000);
    assert.equal(post('dm','setGameStatus',{gameId,status:'ACTIVE'}).ok,true);
    api.advanceCacheTime(4_000);
    assert.equal(post('dm','setGameStatus',{gameId,status:'CANCELLED'}).ok,true);
    assert.equal(api.get({action:'game',gameId}).ok,false);
  });
});
