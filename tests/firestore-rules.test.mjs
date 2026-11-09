import { readFile } from 'node:fs/promises';
import { before, beforeEach, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { saveProfile, publicProfile, privateProfile } from './helpers/fixtures.mjs';

let env;
const db = uid => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const admin = fn => env.withSecurityRulesDisabled(context => fn(context.firestore()));

before(async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  env = await initializeTestEnvironment({ projectId: 'demo-cumbre20-rules', firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await admin(async database => { for (const [uid, role] of [['player','PLAYER'], ['dm','DM'], ['other','PLAYER']]) await saveProfile(database, uid, role); });
});
after(async () => env?.cleanup());

describe('Firestore permissions executed by the emulator', { concurrency: false }, () => {
  it('denies visitors public profiles, private contacts and participant identities', async () => {
    for (const path of ['users/dm','userPrivate/dm','gameParticipants/member']) await assertFails(getDoc(doc(db(), path)));
  });
  it('allows the owner to read a private contact and rejects unrelated users', async () => {
    await assertSucceeds(getDoc(doc(db('player'), 'userPrivate/player')));
    await assertFails(getDoc(doc(db('player'), 'userPrivate/dm')));
  });
  it('allows a complete profile and its private contact to be created atomically', async () => {
    await assertSucceeds(saveProfile(db('new-player'), 'new-player'));
    assert.equal((await getDoc(doc(db('new-player'), 'users/new-player'))).data().profileCompleted, true);
  });
  it('rejects a complete profile without consent/contact, then permits an incomplete draft', async () => {
    await assertFails(setDoc(doc(db('draft'), 'users/draft'), publicProfile('draft')));
    await assertSucceeds(setDoc(doc(db('draft'), 'users/draft'), publicProfile('draft','PLAYER',false)));
  });
  it('permits an owner update but prevents editing or deleting another profile', async () => {
    await assertSucceeds(updateDoc(doc(db('player'), 'users/player'), { firstName:'Nuevo', updatedAt:serverTimestamp() }));
    await assertFails(updateDoc(doc(db('player'), 'users/dm'), { firstName:'Ajeno', updatedAt:serverTimestamp() }));
    await assertFails(deleteDoc(doc(db('player'), 'users/dm')));
  });
  it('rejects private contact fields injected into a public profile', async () => {
    await assertFails(updateDoc(doc(db('player'), 'users/player'), { email:'private@example.test', updatedAt:serverTimestamp() }));
  });
  it('rejects malformed contact data', async () => {
    await assertFails(updateDoc(doc(db('player'), 'userPrivate/player'), { whatsappUrl:'https://evil.example.test/', updatedAt:serverTimestamp() }));
  });
  it('prevents clients, including DMs, from creating protected business records', async () => {
    for (const uid of ['player','dm']) for (const path of ['gameJoinRequests/fake','gameParticipants/fake','contactGrants/dm/viewers/player','users/player/notifications/fake']) {
      await assertFails(setDoc(doc(db(uid), path), { status:'APPROVED', playerUid:'player', dmUid:'dm' }));
    }
  });
  it('a grant allows exactly the approved pair and never a list of contacts', async () => {
    await admin(database => setDoc(doc(database,'contactGrants/dm/viewers/player'),{ gameId:'PRT-TEST',requestId:'REQ-TEST',targetUid:'dm',viewerUid:'player' }));
    await assertSucceeds(getDoc(doc(db('player'),'userPrivate/dm')));
    await assertFails(getDoc(doc(db('other'),'userPrivate/dm')));
    await assertFails(getDocs(collection(db('player'),'userPrivate')));
  });
  it('either direction of blocking revokes granted contact access', async () => {
    await admin(async database => {
      await setDoc(doc(database,'contactGrants/dm/viewers/player'),{});
      await setDoc(doc(database,'users/dm/blockedUsers/player'),{ uid:'player',displayName:'Prueba',createdAt:serverTimestamp() });
    });
    await assertFails(getDoc(doc(db('player'),'userPrivate/dm')));
    await admin(async database => { await deleteDoc(doc(database,'users/dm/blockedUsers/player')); await setDoc(doc(database,'users/player/blockedUsers/dm'),{ uid:'dm',displayName:'Prueba',createdAt:serverTimestamp() }); });
    await assertFails(getDoc(doc(db('player'),'userPrivate/dm')));
  });
  it('an inactive or incomplete viewer cannot use a contact grant', async () => {
    await admin(async database => { await setDoc(doc(database,'contactGrants/dm/viewers/player'),{}); await updateDoc(doc(database,'users/player'),{ profileCompleted:false }); });
    await assertFails(getDoc(doc(db('player'),'userPrivate/dm')));
    await admin(database => updateDoc(doc(database,'users/player'),{ profileCompleted:true,active:false }));
    await assertFails(getDoc(doc(db('player'),'userPrivate/dm')));
  });
  it('only the request parties can read it; approval must go through the backend', async () => {
    await admin(database => setDoc(doc(database,'gameJoinRequests/req'),{ id:'req',gameId:'game',playerUid:'player',dmUid:'dm',status:'PENDING',seenByDm:false,updatedAt:serverTimestamp() }));
    await assertSucceeds(getDoc(doc(db('player'),'gameJoinRequests/req')));
    await assertSucceeds(getDoc(doc(db('dm'),'gameJoinRequests/req')));
    await assertFails(getDoc(doc(db('other'),'gameJoinRequests/req')));
    await assertFails(updateDoc(doc(db('player'),'gameJoinRequests/req'),{ status:'APPROVED',updatedAt:serverTimestamp() }));
    await assertFails(updateDoc(doc(db('dm'),'gameJoinRequests/req'),{ status:'APPROVED',updatedAt:serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db('dm'),'gameJoinRequests/req'),{ seenByDm:true,seenAt:serverTimestamp(),updatedAt:serverTimestamp() }));
  });
  it('notifications can only be read/marked by their owner', async () => {
    await admin(database => setDoc(doc(database,'users/player/notifications/n'),{ title:'Prueba',read:false,createdAt:serverTimestamp() }));
    await assertFails(getDoc(doc(db('other'),'users/player/notifications/n')));
    await assertSucceeds(updateDoc(doc(db('player'),'users/player/notifications/n'),{ read:true,readAt:serverTimestamp() }));
    await assertFails(updateDoc(doc(db('player'),'users/player/notifications/n'),{ title:'Modificado' }));
  });
  it('visitors can read published communities, but cannot publish or read drafts', async () => {
    await admin(async database => { await setDoc(doc(database,'roleCommunities/live'),{status:'PUBLISHED',active:true}); await setDoc(doc(database,'roleCommunities/draft'),{status:'PENDING',active:true}); });
    await assertSucceeds(getDoc(doc(db(),'roleCommunities/live')));
    await assertFails(getDoc(doc(db(),'roleCommunities/draft')));
    await assertSucceeds(getDocs(query(collection(db(),'roleCommunities'),where('status','==','PUBLISHED'),where('active','==',true))));
    await assertFails(setDoc(doc(db('dm'),'roleCommunities/fake'),{status:'PUBLISHED',active:true}));
  });
});
