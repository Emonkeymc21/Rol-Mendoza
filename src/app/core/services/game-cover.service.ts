import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PreparedGameCover } from '../models/game.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GameCoverService {
  constructor(private auth: AuthService) {}

  prepare(file: File, gameId: string, progress: (percent: number) => void): Observable<PreparedGameCover> {
    return new Observable(observer => {
      if (!file.size || file.size > 4 * 1024 * 1024) {
        observer.error(new Error('Elegí una imagen de hasta 4 MB.'));
        return;
      }
      // HttpClient uses Fetch in this app. XHR reports upload progress on iOS and Android.
      const request = new XMLHttpRequest();
      const interrupted = () => observer.error(new Error('La carga se interrumpió. Volvé a elegir la imagen para reintentar.'));
      request.upload.onprogress = event => {
        if (event.lengthComputable) progress(Math.round(100 * event.loaded / event.total));
      };
      request.onload = () => {
        const body = request.response;
        if (request.status === 200 && body?.detail && body?.card && body?.expires && body?.signature) {
          observer.next(body);
          observer.complete();
          return;
        }
        observer.error(new Error(body?.error || 'No pudimos cargar la portada. Intentá nuevamente.'));
      };
      request.onerror = interrupted;
      request.ontimeout = interrupted;
      void Promise.all([file.arrayBuffer(), this.auth.getIdToken()]).then(([bytes, token]) => {
        if (observer.closed) return;
        const query = gameId ? '?gameId=' + encodeURIComponent(gameId) : '';
        request.open('POST', '/api/game-cover' + query);
        request.timeout = 45000;
        request.responseType = 'json';
        request.setRequestHeader('Authorization', 'Bearer ' + token);
        // Use a binary envelope so the platform leaves the untrusted bytes untouched.
        request.setRequestHeader('Content-Type', 'application/octet-stream');
        request.send(bytes);
      }).catch(error => {
        if (!observer.closed) observer.error(new Error(error instanceof DOMException
          ? 'No pudimos leer el archivo. Volvé a elegirlo.'
          : 'Volvé a iniciar sesión para cargar la portada.'));
      });
      return () => request.abort();
    });
  }
}
