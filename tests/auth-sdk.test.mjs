import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, applyActionCode, sendPasswordResetEmail, confirmPasswordReset, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, getDoc, doc, terminate } from 'firebase/firestore';
import { saveProfile } from './helpers/fixtures.mjs';

const projectId = 'demo-cumbre20';
let app, auth, database;
before(async () => {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  app=initializeApp({projectId,apiKey:'emulator-only-key',authDomain:`${projectId}.firebaseapp.com`},`sdk-${randomUUID()}`);
  auth=getAuth(app); connectAuthEmulator(auth,'http://127.0.0.1:9099');
  database=getFirestore(app); connectFirestoreEmulator(database,'127.0.0.1',8080);
});
after(async () => { await signOut(auth); await terminate(database); await deleteApp(app); });

async function oob(email,type) {
  const result=await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`).then(r=>r.json());
  const code=result.oobCodes?.filter(c=>c.email===email&&c.requestType===type).at(-1)?.oobCode;
  assert.ok(code,`Missing emulated ${type} code`); return code;
}
describe('modular Firebase SDK Auth + Firestore on isolated emulators', {concurrency:false}, () => {
  it('registers, verifies email, saves a profile, signs out/in and refreshes the ID token', async () => {
    const email=`sdk-${randomUUID()}@example.test`, password='Only-an-emulator-123!';
    const {user}=await createUserWithEmailAndPassword(auth,email,password);
    const uid=user.uid;
    assert.equal(user.emailVerified,false);
    await sendEmailVerification(user);
    await applyActionCode(auth,await oob(email,'VERIFY_EMAIL'));
    await user.reload(); assert.equal(user.emailVerified,true);
    await saveProfile(database,uid);
    assert.equal((await getDoc(doc(database,'users',uid))).data().uid,uid);
    await signOut(auth); assert.equal(auth.currentUser,null);
    await signInWithEmailAndPassword(auth,email,password);
    assert.equal(auth.currentUser.uid,uid);
    const token=await auth.currentUser.getIdToken(true);
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
    assert.equal(claims.sub,uid); assert.ok(claims.exp*1000>Date.now());
  });
  it('completes password recovery without sending email to a real address', async () => {
    await signOut(auth);
    const email=`reset-${randomUUID()}@example.test`, old='Only-an-emulator-123!', next='Only-an-emulator-456!';
    const {user}=await createUserWithEmailAndPassword(auth,email,old); const uid=user.uid;
    await sendPasswordResetEmail(auth,email);
    await confirmPasswordReset(auth,await oob(email,'PASSWORD_RESET'),next);
    await signOut(auth);
    await assert.rejects(signInWithEmailAndPassword(auth,email,old));
    await signInWithEmailAndPassword(auth,email,next);
    assert.equal(auth.currentUser.uid,uid);
  });
  it('accepts an emulated Google ID token through the modular provider API', async () => {
    await signOut(auth);
    const mock=JSON.stringify({sub:`google-${randomUUID()}`,email:`google-${randomUUID()}@example.test`,email_verified:true});
    const {user}=await signInWithCredential(auth,GoogleAuthProvider.credential(mock));
    assert.equal(user.providerData[0].providerId,'google.com');
    assert.equal(user.emailVerified,true);
  });
});
