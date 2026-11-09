import { disableNetwork, enableNetwork, type Firestore } from 'firebase/firestore';

// Close channels before a document is unloaded. Keep the instance/listeners so
// Safari can resume a document restored from its back/forward cache.
export function bindFirestorePageLifecycle(database: Firestore, page: EventTarget = window): () => void {
  let suspended = false;
  const hide = () => {
    suspended = true;
    void disableNetwork(database).catch(error => console.error('No se pudo pausar la conexión de Firestore.', error));
  };
  const show = () => {
    if (!suspended) return;
    suspended = false;
    void enableNetwork(database).catch(error => console.error('No se pudo restaurar la conexión de Firestore.', error));
  };
  page.addEventListener('pagehide', hide);
  page.addEventListener('pageshow', show);
  return () => {
    page.removeEventListener('pagehide', hide);
    page.removeEventListener('pageshow', show);
  };
}
