// Loaded after Angular can render the public page. No AngularFire dependency.
export {
  browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence,
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile
} from 'firebase/auth';
