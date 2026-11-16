import { PreparedGameCover } from '../../core/models/game.model';

export const COVER_FILE_LIMIT = 4 * 1024 * 1024;

export function prepareGameCover(
  file: Blob, gameId: string, uploadId: string, token: string, signal: AbortSignal,
  progress: (percentage: number | null) => void
): Promise<PreparedGameCover> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    if (signal.aborted) return reject(new DOMException('Upload cancelled', 'AbortError'));
    request.open('POST', '/api/game-cover');
    request.timeout = 60000;
    request.responseType = 'json';
    request.setRequestHeader('Authorization', 'Bearer ' + token);
    request.setRequestHeader('Content-Type', 'application/octet-stream');
    request.setRequestHeader('X-Cumbre-Game', gameId);
    request.setRequestHeader('X-Cumbre-Upload', uploadId);
    request.upload.onprogress = event => {
      if (event.lengthComputable) progress(Math.round(event.loaded * 100 / event.total));
    };
    request.upload.onload = () => progress(null);
    request.onload = () => {
      if (request.status === 200 && request.response?.proof) resolve(request.response);
      else reject(new Error(request.response?.error || 'No pudimos subir la portada. Intentá nuevamente.'));
    };
    request.onerror = request.ontimeout = () => reject(new Error('Se interrumpió la carga. Podés volver a intentarlo.'));
    request.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    request.onloadend = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
    request.send(file);
  });
}

// iOS may hand the browser a HEIC photo instead of a JPEG from the photo picker.
export async function convertHeic(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir la foto.')), 'image/jpeg', 0.88
    ));
  } finally {
    bitmap.close();
  }
}
