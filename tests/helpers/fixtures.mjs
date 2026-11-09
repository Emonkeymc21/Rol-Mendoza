import { serverTimestamp, writeBatch, doc } from 'firebase/firestore';
export function publicProfile(uid, role = 'PLAYER', complete = true) {
  return { uid, displayName: `Prueba ${role}`, firstName: 'Prueba', lastName: 'Aislada', role, province: 'Mendoza', city: complete ? 'Guaymallén' : '', avatarClass: 'FIGHTER', active: true, profileCompleted: complete,
    preferences: { systems: complete ? ['Fate'] : [], experience: complete ? 'Principiante' : '', mode: 'Mixto', frequency: complete ? 'One-shot' : '', availability: complete ? 'Sábados desde las 18' : '', atmosphere: complete ? 'Me adapto al grupo' : '', bio: complete ? 'Perfil ficticio usado únicamente para comprobar los permisos y los flujos de Cumbre20 en el emulador.' : '' }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
}
export function privateProfile(uid) {
  return { uid, whatsappNumber: '5492615551234', whatsappUrl: 'https://wa.me/5492615551234', instagramUsername: '', instagramUrl: '', alternatePhone: '', privacyConsent: true, privacyConsentAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
}
export async function saveProfile(db, uid, role = 'PLAYER') {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), publicProfile(uid, role));
  batch.set(doc(db, 'userPrivate', uid), privateProfile(uid));
  await batch.commit();
}
