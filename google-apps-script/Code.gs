/**
 * API de Rol Mendoza.
 *
 * Lecturas públicas: partidas activas y comentarios.
 * Escrituras privadas: requieren un Firebase ID token válido.
 * Los perfiles y contactos viven en Firestore; Sheets solo administra partidas.
 */
const CONFIG = Object.freeze({
  gamesSpreadsheetId: '1ZtbK4j_V8ePbUgaZZkeTtP7vFcnjsn2R7s2brRtvw9k',
  firebaseWebApiKey: 'AIzaSyDAUvtcTyEQmbGmmmOGJTsyVg34dt1h_gU',
  firebaseProjectId: 'rol-mendoza',
  apiVersion: '5.0.0',
  sheets: Object.freeze({
    games: 'PARTIDAS',
    requests: 'SOLICITUDES',
    comments: 'COMENTARIOS'
  }),
  rateSeconds: Object.freeze({
    createGame: 30,
    updateGame: 5,
    setGameStatus: 3,
    deleteGame: 5,
    joinGame: 20,
    createComment: 20
  })
});

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = cleanText_(params.action || 'health', 40);

    switch (action) {
      case 'health':
        return json_({
          ok: true,
          data: {
            service: 'Rol Mendoza API',
            version: CONFIG.apiVersion,
            auth: firebaseConfigured_() ? 'configured' : 'pending',
            timestamp: new Date().toISOString()
          }
        });
      case 'games':
        return json_({ ok: true, data: getPublicGames_() });
      case 'game':
        return json_({ ok: true, data: getPublicGame_(requiredText_(params.gameId, 'gameId', 80)) });
      case 'comments':
        return json_({
          ok: true,
          data: getPublicComments_(requiredText_(params.gameId, 'gameId', 80))
        });
      default:
        throw new Error('Acción GET no válida.');
    }
  } catch (error) {
    return errorJson_(error);
  }
}

function doPost(e) {
  try {
    const request = parseRequest_(e);
    const action = cleanText_(request.action, 40);
    const payload = request.payload || {};
    if (!action) throw new Error('Falta indicar la acción.');
    if (request.apiVersion && cleanText_(request.apiVersion, 20) !== CONFIG.apiVersion) {
      throw new Error('La versión de la aplicación no coincide con la versión de la API.');
    }

    const idToken = requiredText_(request.idToken, 'sesión', 5000);
    const user = verifyFirebaseToken_(idToken);
    rateLimit_(action, user.uid);

    switch (action) {
      case 'createGame':
        return json_({ ok: true, data: createGame_(payload, firebaseAccount_(user), requireDm_(idToken, user.uid)) });
      case 'myGames':
        return json_({ ok: true, data: getOwnedGames_(user.uid) });
      case 'ownedGame':
        return json_({ ok: true, data: getOwnedGame_(requiredText_(payload.gameId, 'partida', 80), user.uid) });
      case 'updateGame':
        return json_({ ok: true, data: updateGame_(payload, firebaseAccount_(user)) });
      case 'setGameStatus':
        return json_({ ok: true, data: setGameStatus_(payload, user.uid) });
      case 'deleteGame':
        return json_({ ok: true, data: cancelGame_(payload, user.uid) });
      case 'joinGame':
        return json_({ ok: true, data: createJoinRequest_(payload, firebaseAccount_(user)) });
      case 'createComment':
        return json_({ ok: true, data: createComment_(payload, firebaseAccount_(user)) });
      default:
        throw new Error('Acción POST no válida.');
    }
  } catch (error) {
    return errorJson_(error);
  }
}

function getPublicGames_() {
  return readObjects_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games)
    .filter(isPublicGame_)
    .sort(function (a, b) {
      return new Date(b.creada_el || 0).getTime() - new Date(a.creada_el || 0).getTime();
    })
    .map(publicGame_);
}

function getPublicGame_(gameId) {
  const game = findGame_(gameId);
  if (!game || !isPublicGame_(game)) throw new Error('Esta partida no existe o no está disponible.');
  return publicGame_(game);
}

function getOwnedGames_(uid) {
  return readObjects_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games)
    .filter(function (row) { return String(row.creador_uid || '') === String(uid); })
    .sort(function (a, b) {
      return new Date(b.actualizada_el || b.creada_el || 0).getTime() - new Date(a.actualizada_el || a.creada_el || 0).getTime();
    })
    .map(ownedGame_);
}

function getOwnedGame_(gameId, uid) {
  const game = findGame_(gameId);
  assertOwner_(game, uid);
  return ownedGame_(game);
}

function publicGame_(row) {
  const safe = pick_(row, [
    'partida_id', 'creada_el', 'titulo', 'sistema', 'modalidad', 'ciudad', 'zona_plataforma',
    'fecha', 'hora', 'dia_horario', 'frecuencia', 'cupos_totales', 'cupos_libres',
    'jugadores_actuales', 'nivel', 'edad_requerida', 'metodo_contacto', 'tono',
    'descripcion', 'herramientas_cuidado', 'estado', 'actualizada_el'
  ]);
  safe.master_nombre = row.master_nombre_publico || 'Máster de la comunidad';
  safe.master_usuario_id = row.creador_uid || '';
  safe.estado = canonicalStatus_(row.estado);
  return safe;
}

function ownedGame_(row) {
  const game = publicGame_(row);
  game.creador_email = row.creador_email || '';
  return game;
}

function getPublicComments_(gameId) {
  return readObjects_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.comments)
    .filter(function (row) {
      return cleanText_(row.comentario_id, 80) &&
        String(row.partida_id) === String(gameId) &&
        normalize_(row.estado) === 'publicado';
    })
    .sort(function (a, b) {
      return new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime();
    })
    .map(function (row) {
      return pick_(row, [
        'comentario_id', 'fecha', 'partida_id', 'nombre_publico', 'comentario', 'respuesta_admin'
      ]);
    });
}

function createGame_(payload, account, profile) {
  const title = requiredText_(payload.title, 'título', 120, 5);
  const system = requiredText_(payload.system, 'sistema', 100, 2);
  const location = requiredText_(payload.location, 'zona o plataforma', 120, 2);
  const mode = oneOf_(payload.mode, ['Presencial', 'Online', 'Mixto'], 'modalidad');
  const schedule = requiredText_(payload.schedule, 'día y horario', 120, 3);
  const frequency = oneOf_(payload.frequency, ['One-shot', 'Semanal', 'Quincenal', 'Mensual'], 'frecuencia');
  const seats = integerBetween_(payload.seats, 'lugares libres', 1, 12);
  const totalSeats = integerBetween_(payload.totalSeats, 'tamaño total', 2, 12);
  if (seats > totalSeats) throw new Error('Los lugares libres no pueden superar el tamaño total.');
  const currentPlayers = integerBetween_(payload.currentPlayers || 0, 'jugadores actuales', 0, totalSeats);
  if (seats + currentPlayers > totalSeats) {
    throw new Error('Los lugares libres más los jugadores actuales no pueden superar el tamaño total.');
  }

  const now = new Date();
  const id = makeId_('PRT');
  appendObject_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, {
    partida_id: id,
    creada_el: now,
    creador_uid: account.firebase_uid,
    creador_email: account.email,
    titulo: title,
    sistema: system,
    master_nombre_publico: account.nombre_publico,
    modalidad: mode,
    ciudad: requiredText_(payload.city || profile.city, 'ciudad', 80, 2),
    zona_plataforma: location,
    fecha: cleanText_(payload.date, 30),
    hora: cleanText_(payload.time, 30),
    dia_horario: schedule,
    frecuencia: frequency,
    cupos_totales: totalSeats,
    cupos_libres: seats,
    jugadores_actuales: currentPlayers,
    nivel: requiredText_(payload.level, 'experiencia buscada', 100, 2),
    edad_requerida: requiredText_(payload.ageRequirement || 'Sin requisito', 'edad requerida', 60, 2),
    metodo_contacto: requiredText_(payload.contactMethod || 'Perfil del máster', 'método de contacto', 80, 2),
    tono: requiredText_(payload.tone, 'tono', 100, 2),
    descripcion: requiredText_(payload.summary, 'resumen', 420, 30),
    herramientas_cuidado: requiredText_(payload.safety, 'herramientas de cuidado', 180, 2),
    estado: 'ACTIVE',
    publicada: 'Sí',
    actualizada_el: now
  });

  return { id: id, status: 'ACTIVE', message: '¡Partida publicada! Tu partida ya está disponible para la comunidad.' };
}

function updateGame_(payload, account) {
  const gameId = requiredText_(payload.id || payload.gameId, 'partida', 80);
  const record = findGameWithRow_(gameId);
  assertOwner_(record && record.data, account.firebase_uid);

  const current = record.data;
  const totalSeats = integerBetween_(payload.totalSeats, 'tamaño total', 2, 12);
  const seats = integerBetween_(payload.seats, 'lugares libres', 0, totalSeats);
  const currentPlayers = integerBetween_(payload.currentPlayers || 0, 'jugadores actuales', 0, totalSeats);
  if (seats + currentPlayers > totalSeats) {
    throw new Error('Los lugares libres más los jugadores actuales no pueden superar el tamaño total.');
  }
  const next = Object.assign({}, current, {
    titulo: requiredText_(payload.title, 'título', 120, 5),
    sistema: requiredText_(payload.system, 'sistema', 100, 2),
    master_nombre_publico: account.nombre_publico,
    creador_email: account.email,
    modalidad: oneOf_(payload.mode, ['Presencial', 'Online', 'Mixto'], 'modalidad'),
    ciudad: requiredText_(payload.city, 'ciudad', 80, 2),
    zona_plataforma: requiredText_(payload.location, 'zona o plataforma', 120, 2),
    fecha: cleanText_(payload.date, 30),
    hora: cleanText_(payload.time, 30),
    dia_horario: requiredText_(payload.schedule, 'día y horario', 120, 3),
    frecuencia: oneOf_(payload.frequency, ['One-shot', 'Semanal', 'Quincenal', 'Mensual'], 'frecuencia'),
    cupos_totales: totalSeats,
    cupos_libres: seats,
    jugadores_actuales: currentPlayers,
    nivel: requiredText_(payload.level, 'experiencia buscada', 100, 2),
    edad_requerida: requiredText_(payload.ageRequirement || 'Sin requisito', 'edad requerida', 60, 2),
    metodo_contacto: requiredText_(payload.contactMethod || 'Perfil del máster', 'método de contacto', 80, 2),
    tono: requiredText_(payload.tone, 'tono', 100, 2),
    descripcion: requiredText_(payload.summary, 'resumen', 420, 30),
    herramientas_cuidado: requiredText_(payload.safety, 'herramientas de cuidado', 180, 2),
    actualizada_el: new Date()
  });
  upsertObject_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, next, record.rowNumber);
  return { id: gameId, status: canonicalStatus_(next.estado), message: 'La partida fue actualizada.' };
}

function setGameStatus_(payload, uid) {
  const gameId = requiredText_(payload.gameId, 'partida', 80);
  const status = oneOf_(String(payload.status || '').toUpperCase(), ['ACTIVE', 'PAUSED', 'CANCELLED', 'FULL'], 'estado');
  const record = findGameWithRow_(gameId);
  assertOwner_(record && record.data, uid);
  const next = Object.assign({}, record.data, {
    estado: status,
    publicada: status === 'ACTIVE' || status === 'FULL' ? 'Sí' : 'No',
    actualizada_el: new Date()
  });
  upsertObject_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, next, record.rowNumber);
  return { id: gameId, status: status, message: statusMessage_(status) };
}

function cancelGame_(payload, uid) {
  return setGameStatus_({ gameId: payload.gameId, status: 'CANCELLED' }, uid);
}

function createJoinRequest_(payload, account) {
  const gameId = requiredText_(payload.gameId, 'partida', 80);
  const game = findGame_(gameId);
  if (!game || !isPublicGame_(game)) throw new Error('La partida no está disponible.');
  if (canonicalStatus_(game.estado) !== 'ACTIVE' || Number(game.cupos_libres || 0) < 1) {
    throw new Error('La partida ya no tiene inscripciones abiertas.');
  }

  const id = makeId_('SOL');
  appendObject_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.requests, {
    solicitud_id: id,
    fecha: new Date(),
    partida_id: gameId,
    usuario_uid: account.firebase_uid,
    nombre_publico: account.nombre_publico,
    mensaje: cleanText_(payload.message, 500),
    estado: 'Pendiente',
    respuesta_admin: '',
    fecha_respuesta: '',
    visible_para_usuario: 'No'
  });

  return { id: id, status: 'received', message: 'Tu solicitud fue registrada y quedó disponible para el máster.' };
}

function createComment_(payload, account) {
  const gameId = requiredText_(payload.gameId, 'partida', 80);
  const game = findGame_(gameId);
  if (!game || !isPublicGame_(game)) throw new Error('La partida no está disponible.');

  const id = makeId_('COM');
  appendObject_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.comments, {
    comentario_id: id,
    fecha: new Date(),
    partida_id: gameId,
    usuario_uid: account.firebase_uid,
    nombre_publico: account.nombre_publico,
    comentario: requiredText_(payload.comment, 'comentario', 700, 3),
    estado: 'Publicado',
    respuesta_admin: '',
    fecha_moderacion: new Date()
  });

  return { id: id, status: 'published', message: 'Tu comentario fue publicado.' };
}

function firebaseAccount_(user) {
  return {
    firebase_uid: user.uid,
    email: user.email,
    nombre_publico: cleanText_(user.displayName || user.email.split('@')[0] || 'Aventurero/a', 80)
  };
}

function requireDm_(idToken, uid) {
  const response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
      '/databases/(default)/documents/users/' + encodeURIComponent(uid),
    {
      method: 'get',
      headers: { Authorization: 'Bearer ' + idToken },
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('No pudimos verificar tu perfil de Dungeon Master. Completá tu perfil e intentá nuevamente.');
  }
  const document = JSON.parse(response.getContentText());
  const fields = document.fields || {};
  const role = fields.role && fields.role.stringValue;
  const completed = fields.profileCompleted && fields.profileCompleted.booleanValue === true;
  const active = !fields.active || fields.active.booleanValue === true;
  if (!completed || !active || (role !== 'DM' && role !== 'BOTH')) {
    throw new Error('Solamente los perfiles con rol DM o Ambos pueden crear partidas.');
  }
  return {
    role: role,
    city: cleanText_(fields.city && fields.city.stringValue, 80)
  };
}

function verifyFirebaseToken_(idToken) {
  if (!firebaseConfigured_()) throw new Error('Firebase todavía no está configurado en Apps Script.');

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken, Utilities.Charset.UTF_8);
  const cacheKey = 'firebase_' + Utilities.base64EncodeWebSafe(digest).slice(0, 40);
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(CONFIG.firebaseWebApiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() !== 200) throw new Error('La sesión venció o no es válida. Volvé a ingresar.');

  const body = JSON.parse(response.getContentText());
  const firebaseUser = body.users && body.users[0];
  if (!firebaseUser || !firebaseUser.localId || !firebaseUser.email) {
    throw new Error('No pudimos validar la cuenta de Firebase.');
  }

  const providerInfo = firebaseUser.providerUserInfo && firebaseUser.providerUserInfo[0];
  const user = {
    uid: cleanText_(firebaseUser.localId, 160),
    email: cleanText_(firebaseUser.email, 254).toLowerCase(),
    emailVerified: Boolean(firebaseUser.emailVerified),
    displayName: cleanText_(firebaseUser.displayName || (providerInfo && providerInfo.displayName), 80),
    providerId: cleanText_((providerInfo && providerInfo.providerId) || 'password', 40)
  };
  cache.put(cacheKey, JSON.stringify(user), 300);
  return user;
}

function firebaseConfigured_() {
  return Boolean(CONFIG.firebaseWebApiKey) && CONFIG.firebaseWebApiKey.indexOf('PEGAR_') !== 0;
}

function findGame_(gameId) {
  const games = readObjects_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games);
  for (let index = 0; index < games.length; index += 1) {
    if (String(games[index].partida_id) === String(gameId)) return games[index];
  }
  return null;
}

function findGameWithRow_(gameId) {
  const sheet = getSheet_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0].map(function (header) { return String(header).trim(); });
  const idIndex = headers.indexOf('partida_id');
  if (idIndex < 0) throw new Error('La hoja PARTIDAS no tiene la columna partida_id.');
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idIndex]) === String(gameId)) {
      const data = {};
      headers.forEach(function (header, column) {
        if (header) data[header] = serializeCell_(values[index][column]);
      });
      return { data: data, rowNumber: index + 1 };
    }
  }
  return null;
}

function assertOwner_(game, uid) {
  if (!game) throw new Error('Esta partida ya no existe.');
  if (String(game.creador_uid || '') !== String(uid)) {
    throw new Error('No tenés permisos para modificar esta partida.');
  }
}

function isPublicGame_(row) {
  if (!cleanText_(row.partida_id, 80)) return false;
  const state = canonicalStatus_(row.estado);
  if (state === 'ACTIVE' || state === 'FULL') return true;
  const published = normalize_(row.publicada) === 'si';
  return published && (normalize_(row.estado) === 'abierta' || normalize_(row.estado) === 'completa');
}

function canonicalStatus_(value) {
  const state = normalize_(value);
  if (state === 'active' || state === 'abierta') return 'ACTIVE';
  if (state === 'paused' || state === 'pausada' || state === 'cerrada') return 'PAUSED';
  if (state === 'full' || state === 'completa') return 'FULL';
  if (state === 'cancelled' || state === 'cancelada') return 'CANCELLED';
  return 'PAUSED';
}

function statusMessage_(status) {
  if (status === 'ACTIVE') return 'La partida está activa y visible.';
  if (status === 'FULL') return 'La partida quedó marcada como completa.';
  if (status === 'CANCELLED') return 'La partida fue cancelada.';
  return 'La partida fue pausada y ya no aparece en la búsqueda pública.';
}

function readObjects_(spreadsheetId, sheetName) {
  const sheet = getSheet_(spreadsheetId, sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function (header) { return String(header).trim(); });
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== '' && cell !== null; });
  }).map(function (row) {
    const object = {};
    headers.forEach(function (header, index) {
      if (header) object[header] = serializeCell_(row[index]);
    });
    return object;
  });
}

function appendObject_(spreadsheetId, sheetName, object) {
  upsertObject_(spreadsheetId, sheetName, object, null);
}

function upsertObject_(spreadsheetId, sheetName, object, rowNumber) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(spreadsheetId, sheetName);
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const row = headers.map(function (header) {
      const value = Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '';
      return safeCell_(value);
    });
    const targetRow = rowNumber || sheet.getLastRow() + 1;
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function getSheet_(spreadsheetId, sheetName) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('No existe la pestaña ' + sheetName + '.');
  return sheet;
}

function parseRequest_(e) {
  const raw = e && e.postData && e.postData.contents;
  if (!raw) throw new Error('La solicitud está vacía.');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('Formato inválido.');
    return parsed;
  } catch (error) {
    throw new Error('El cuerpo debe ser JSON válido.');
  }
}

function rateLimit_(action, userId) {
  const seconds = CONFIG.rateSeconds[action];
  if (!seconds) return;
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    action + ':' + cleanText_(userId, 160),
    Utilities.Charset.UTF_8
  );
  const key = 'rate_' + Utilities.base64EncodeWebSafe(digest).slice(0, 40);
  const cache = CacheService.getScriptCache();
  if (cache.get(key)) throw new Error('Esperá unos segundos antes de volver a enviar.');
  cache.put(key, '1', seconds);
}

function pick_(source, keys) {
  const target = {};
  keys.forEach(function (key) { target[key] = source[key] === undefined ? '' : source[key]; });
  return target;
}

function serializeCell_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return value.toISOString();
  return value;
}

function safeCell_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' || typeof value === 'number') return value;
  const text = String(value === null || value === undefined ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function requiredText_(value, label, maxLength, minLength) {
  const text = cleanText_(value, maxLength);
  const minimum = minLength || 1;
  if (text.length < minimum) throw new Error('Revisá el campo ' + label + '.');
  return text;
}

function cleanText_(value, maxLength) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength || 1000);
}

function integerBetween_(value, label, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error('Revisá el campo ' + label + '.');
  }
  return number;
}

function oneOf_(value, allowed, label) {
  const text = cleanText_(value, 80);
  if (allowed.indexOf(text) === -1) throw new Error('Revisá el campo ' + label + '.');
  return text;
}

function normalize_(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function makeId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), 'America/Argentina/Mendoza', 'yyyyMMddHHmmss');
  return prefix + '-' + stamp + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function errorJson_(error) {
  console.error(error && error.stack ? error.stack : error);
  return json_({ ok: false, error: error && error.message ? error.message : 'Ocurrió un error inesperado.' });
}
