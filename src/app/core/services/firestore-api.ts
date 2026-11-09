// Named modular exports keep unused Firestore APIs out of the lazy browser chunk.
export {
  getFirestore, connectFirestoreEmulator, doc, collection, query, where, getDoc,
  getDocs, setDoc, addDoc, updateDoc, writeBatch, onSnapshot, serverTimestamp,
  orderBy, limit
} from 'firebase/firestore';
