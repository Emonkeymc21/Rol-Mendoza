/**
 * API de Cumbre20.
 *
 * Lecturas públicas: partidas activas y comentarios.
 * Escrituras privadas: requieren un Firebase ID token válido.
 * Los perfiles y contactos viven en Firestore; Sheets solo administra partidas.
 */
const CONFIG = Object.freeze({
  gamesSpreadsheetId: '1ZtbK4j_V8ePbUgaZZkeTtP7vFcnjsn2R7s2brRtvw9k',
  firebaseWebApiKey: 'AIzaSyDAUvtcTyEQmbGmmmOGJTsyVg34dt1h_gU',
  firebaseProjectId: 'rol-mendoza',
  apiVersion: '8.0.0',
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
    resolveJoinRequest: 2,
    removeParticipant: 3,
    createComment: 20
  })
});

/**
 * Ejecutar una vez desde el editor después de cambiar permisos o publicar una
 * versión. Fuerza el consentimiento para Sheets, solicitudes externas y
 * Firestore sin cambiar el deployment ni su URL pública.
 */
function autorizarServiciosCumbre20() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.gamesSpreadsheetId);
  const response = UrlFetchApp.fetch(
    'https://www.googleapis.com/discovery/v1/apis/identitytoolkit/v3/rest',
    { method: 'get', muteHttpExceptions: true }
  );
  const status = response.getResponseCode();
  if (status < 200 || status >= 400) {
    throw new Error('No se pudo comprobar el permiso de solicitudes externas. Código HTTP: ' + status);
  }
  const firestoreCheck = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
      '/databases/(default)/documents:runQuery',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          limit: 1
        }
      }),
      muteHttpExceptions: true
    }
  );
  if (firestoreCheck.getResponseCode() < 200 || firestoreCheck.getResponseCode() >= 300) {
    throw new Error('No se pudo acceder a Firestore con la cuenta propietaria. Código HTTP: ' + firestoreCheck.getResponseCode());
  }
  return {
    ok: true,
    spreadsheet: spreadsheet.getName(),
    externalRequest: true,
    firestore: true,
    apiVersion: CONFIG.apiVersion
  };
}

/**
 * Ejecutar una vez al publicar la versión 8.0.0. Crea los permisos de contacto
 * para solicitudes que ya estaban aceptadas antes de incorporar contactGrants.
 */
function migrarContactosAceptadosCumbre20() {
  const response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
      '/databases/(default)/documents:runQuery',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'gameJoinRequests' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'APPROVED' }
            }
          }
        }
      }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('No pudimos leer las solicitudes aceptadas. Código HTTP: ' + response.getResponseCode());
  }

  const rows = JSON.parse(response.getContentText());
  const writes = [];
  let migrated = 0;
  rows.forEach(function (row) {
    if (!row.document) return;
    const request = row.document;
    const requestId = String(request.name || '').split('/').pop();
    const dmUid = firestoreString_(request, 'dmUid');
    const playerUid = firestoreString_(request, 'playerUid');
    const gameId = firestoreString_(request, 'gameId');
    if (!requestId || !dmUid || !playerUid || !gameId) return;
    Array.prototype.push.apply(writes, contactGrantWrites_(dmUid, playerUid, gameId, requestId, new Date()));
    migrated += 1;
    if (writes.length >= 400) commitFirestoreWrites_(writes.splice(0, writes.length));
  });
  if (writes.length) commitFirestoreWrites_(writes);
  return { ok: true, acceptedRequests: migrated, contactGrants: migrated * 2 };
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = cleanText_(params.action || 'health', 40);

    switch (action) {
      case 'health':
        return json_({
          ok: true,
          data: {
            service: 'Cumbre20 API',
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
        requirePlayer_(idToken, user.uid);
        return json_({ ok: true, data: createJoinRequest_(payload, firebaseAccount_(user)) });
      case 'resolveJoinRequest':
        return json_({ ok: true, data: resolveJoinRequest_(payload, user.uid) });
      case 'removeParticipant':
        return json_({ ok: true, data: removeParticipant_(payload, user.uid) });
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
  const totalSeats = integerBetween_(payload.totalSeats, 'tamaño total', 2, 12);
  const currentPlayers = integerBetween_(payload.currentPlayers || 0, 'jugadores actuales', 0, totalSeats);
  const seats = totalSeats - currentPlayers;
  const initialStatus = currentPlayers >= totalSeats ? 'FULL' : 'ACTIVE';

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
    estado: initialStatus,
    publicada: 'Sí',
    actualizada_el: now
  });

  return { id: id, status: initialStatus, message: '¡Partida publicada! Tu partida ya está disponible para la comunidad.' };
}

function updateGame_(payload, account) {
  const gameId = requiredText_(payload.id || payload.gameId, 'partida', 80);
  const record = findGameWithRow_(gameId);
  assertOwner_(record && record.data, account.firebase_uid);

  const current = record.data;
  const totalSeats = integerBetween_(payload.totalSeats, 'tamaño total', 2, 12);
  const currentPlayers = integerBetween_(payload.currentPlayers || 0, 'jugadores actuales', 0, totalSeats);
  const confirmedInCumbre20 = countParticipantsForGame_(gameId);
  if (currentPlayers < confirmedInCumbre20) {
    throw new Error('Los jugadores actuales no pueden ser menos que los participantes confirmados en Cumbre20.');
  }
  const seats = totalSeats - currentPlayers;
  const currentStatus = canonicalStatus_(current.estado);
  const capacityStatus = currentPlayers >= totalSeats
    ? 'FULL'
    : (currentStatus === 'FULL' ? 'ACTIVE' : currentStatus);
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
    estado: capacityStatus,
    publicada: capacityStatus === 'ACTIVE' || capacityStatus === 'FULL' ? 'Sí' : 'No',
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
  const previousStatus = canonicalStatus_(record.data.estado);
  const next = Object.assign({}, record.data, {
    estado: status,
    publicada: status === 'ACTIVE' || status === 'FULL' ? 'Sí' : 'No',
    actualizada_el: new Date()
  });
  upsertObject_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, next, record.rowNumber);
  if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
    try {
      const notified = notifyGameCancelled_(gameId, uid, cleanText_(next.titulo, 120));
      return {
        id: gameId,
        status: status,
        notified: notified,
        message: notified > 0
          ? 'La partida fue cancelada y avisamos a ' + notified + (notified === 1 ? ' jugador.' : ' jugadores.')
          : 'La partida fue cancelada. No había jugadores a quienes avisar.'
      };
    } catch (error) {
      console.error('No se pudo avisar la cancelación de ' + gameId + ': ' + error);
      return {
        id: gameId,
        status: status,
        notified: 0,
        message: 'La partida fue cancelada, pero no pudimos avisar a todos los jugadores.'
      };
    }
  }
  return { id: gameId, status: status, message: statusMessage_(status) };
}

/**
 * Avisa la cancelación de una mesa a sus confirmados y a quienes tenían la
 * solicitud pendiente. Usa upsert para que re-cancelar no duplique avisos.
 */
function notifyGameCancelled_(gameId, dmUid, gameTitle) {
  const participants = queryDocuments_('gameParticipants', 'gameId', gameId)
    .map(function (document) { return firestoreString_(document, 'playerUid'); });
  const pending = queryDocuments_('gameJoinRequests', 'gameId', gameId)
    .filter(function (document) { return firestoreString_(document, 'status') === 'PENDING'; })
    .map(function (document) { return firestoreString_(document, 'playerUid'); });
  const notified = {};
  participants.concat(pending).forEach(function (playerUid) {
    if (playerUid && playerUid !== dmUid) notified[playerUid] = true;
  });
  const uids = Object.keys(notified);
  if (!uids.length) return 0;
  const now = new Date();
  const title = gameTitle || 'la partida';
  const writes = uids.map(function (playerUid) {
    return firestoreSetWrite_('users/' + playerUid + '/notifications/' + gameId + '-cancelled', {
      id: gameId + '-cancelled',
      type: 'GAME_CANCELLED',
      title: 'Partida cancelada',
      message: '“' + title + '” fue cancelada por el DM.',
      gameId: gameId,
      gameTitle: title,
      requestId: '',
      actorUid: dmUid,
      read: false,
      createdAt: now
    });
  });
  commitFirestoreWrites_(writes);
  return uids.length;
}

/**
 * Remueve a un jugador confirmado: borra el participante, libera el cupo,
 * marca su solicitud como REMOVED y le avisa con una notificación.
 */
function removeParticipant_(payload, uid) {
  const gameId = requiredText_(payload.gameId, 'partida', 80);
  const playerUid = requiredText_(payload.playerUid, 'jugador', 160);
  if (playerUid === uid) throw new Error('No podés removerte de tu propia partida.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const gameRecord = findGameWithRow_(gameId);
    assertOwner_(gameRecord && gameRecord.data, uid);
    const game = gameRecord.data;
    if (canonicalStatus_(game.estado) === 'CANCELLED') throw new Error('La partida está cancelada.');
    const participantId = stableParticipantId_(gameId, playerUid);
    const participant = getFirestoreDocument_('gameParticipants/' + participantId);
    if (!participant) throw new Error('Este jugador ya no forma parte de la partida.');

    const maxPlayers = integerBetween_(game.cupos_totales, 'cantidad máxima de jugadores', 1, 99);
    const currentPlayers = integerBetween_(game.jugadores_actuales || 0, 'jugadores confirmados', 0, maxPlayers);
    const gameStatus = canonicalStatus_(game.estado);
    const updatedPlayers = Math.max(0, currentPlayers - 1);
    const updatedStatus = gameStatus === 'FULL' ? 'ACTIVE' : gameStatus;
    const now = new Date();
    const gameTitle = cleanText_(game.titulo, 120) || 'la partida';
    const updatedGame = Object.assign({}, game, {
      jugadores_actuales: updatedPlayers,
      cupos_libres: Math.max(0, maxPlayers - updatedPlayers),
      estado: updatedStatus,
      publicada: updatedStatus === 'ACTIVE' || updatedStatus === 'FULL' ? 'Sí' : 'No',
      actualizada_el: now
    });

    const requestId = firestoreString_(participant, 'requestId');
    const requestDocument = requestId ? getFirestoreDocument_('gameJoinRequests/' + requestId) : null;

    writeObjectRow_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, updatedGame, gameRecord.rowNumber);
    try {
      const writes = [
        firestoreDeleteWrite_('gameParticipants/' + participantId),
        firestoreSetWrite_('users/' + playerUid + '/notifications/' + participantId + '-removed', {
          id: participantId + '-removed',
          type: 'PLAYER_REMOVED',
          title: 'Te removieron de una mesa',
          message: 'El DM te removió de “' + gameTitle + '” y liberó tu cupo.',
          gameId: gameId,
          gameTitle: gameTitle,
          requestId: requestId,
          actorUid: uid,
          read: false,
          createdAt: now
        })
      ];
      if (requestDocument) {
        writes.push(firestoreUpdateWrite_('gameJoinRequests/' + requestId, {
          status: 'REMOVED',
          resolvedAt: now,
          updatedAt: now
        }));
      }
      commitFirestoreWrites_(writes);
    } catch (error) {
      writeObjectRow_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, game, gameRecord.rowNumber);
      throw error;
    }

    return {
      id: participantId,
      gameId: gameId,
      status: 'REMOVED',
      currentPlayers: updatedPlayers,
      maxPlayers: maxPlayers,
      availableSeats: Math.max(0, maxPlayers - updatedPlayers),
      gameStatus: updatedStatus,
      message: 'Jugador removido. Se liberó su cupo y se le avisó.'
    };
  } finally {
    lock.releaseLock();
  }
}

function createJoinRequest_(payload, account) {
  const gameId = requiredText_(payload.gameId, 'partida', 80);
  const game = findGame_(gameId);
  if (!game || !isPublicGame_(game)) throw new Error('La partida no está disponible.');
  if (canonicalStatus_(game.estado) !== 'ACTIVE' || Number(game.cupos_libres || 0) < 1) {
    throw new Error('La partida ya no tiene inscripciones abiertas.');
  }

  const dmUid = requiredText_(game.creador_uid, 'creador de la partida', 160);
  if (dmUid === account.firebase_uid) throw new Error('No podés solicitar unirte a una partida creada por vos.');

  const id = stableRequestId_(gameId, account.firebase_uid);
  const existing = getFirestoreDocument_('gameJoinRequests/' + id);
  if (existing) {
    const status = firestoreString_(existing, 'status') || 'PENDING';
    const messages = {
      PENDING: 'Ya tenés una solicitud pendiente para esta partida.',
      APPROVED: 'Ya formás parte de esta partida.',
      REJECTED: 'Esta solicitud no fue aceptada.'
    };
    return { id: id, status: status, duplicate: true, message: messages[status] || messages.PENDING };
  }

  const now = new Date();
  const gameTitle = requiredText_(game.titulo, 'título de la partida', 120);
  const requestDocument = {
    id: id,
    gameId: gameId,
    gameTitle: gameTitle,
    playerUid: account.firebase_uid,
    playerName: account.nombre_publico,
    dmUid: dmUid,
    dmName: cleanText_(game.master_nombre_publico || 'Dungeon Master', 80),
    message: cleanText_(payload.message, 500),
    status: 'PENDING',
    seenByDm: false,
    createdAt: now,
    updatedAt: now
  };
  const notificationId = 'join-' + id;
  const notificationDocument = {
    id: notificationId,
    type: 'JOIN_REQUEST',
    title: account.nombre_publico + ' quiere unirse a tu partida',
    message: gameTitle,
    gameId: gameId,
    gameTitle: gameTitle,
    requestId: id,
    actorUid: account.firebase_uid,
    read: false,
    createdAt: now
  };

  createFirestoreDocuments_([
    { path: 'gameJoinRequests/' + id, data: requestDocument },
    { path: 'users/' + dmUid + '/notifications/' + notificationId, data: notificationDocument }
  ]);

  return { id: id, status: 'PENDING', message: 'Solicitud enviada. El DM recibió tu solicitud.' };
}

function stableRequestId_(gameId, playerUid) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(gameId) + ':' + String(playerUid),
    Utilities.Charset.UTF_8
  );
  return 'REQ-' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '').slice(0, 32);
}

function stableParticipantId_(gameId, playerUid) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(gameId) + ':' + String(playerUid),
    Utilities.Charset.UTF_8
  );
  return 'MEM-' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '').slice(0, 32);
}

function contactGrantWrites_(dmUid, playerUid, gameId, requestId, now) {
  const sharedData = {
    gameId: gameId,
    requestId: requestId,
    createdAt: now,
    updatedAt: now
  };
  return [
    firestoreSetWrite_('contactGrants/' + dmUid + '/viewers/' + playerUid, Object.assign({}, sharedData, {
      targetUid: dmUid,
      viewerUid: playerUid
    })),
    firestoreSetWrite_('contactGrants/' + playerUid + '/viewers/' + dmUid, Object.assign({}, sharedData, {
      targetUid: playerUid,
      viewerUid: dmUid
    }))
  ];
}

/**
 * Resuelve una solicitud desde el backend. La aceptación usa un lock único,
 * crea un participante determinístico y sincroniza el contador de Sheets. Si
 * Firestore rechazara el commit, la fila de Sheets se restaura antes de salir.
 */
function resolveJoinRequest_(payload, uid) {
  const requestId = requiredText_(payload.requestId, 'solicitud', 80);
  const nextStatus = oneOf_(String(payload.status || '').toUpperCase(), ['APPROVED', 'REJECTED'], 'estado');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const requestDocument = getFirestoreDocument_('gameJoinRequests/' + requestId);
    if (!requestDocument) throw new Error('Esta solicitud ya no existe.');

    const currentStatus = firestoreString_(requestDocument, 'status') || 'PENDING';
    const dmUid = firestoreString_(requestDocument, 'dmUid');
    const playerUid = firestoreString_(requestDocument, 'playerUid');
    const gameId = firestoreString_(requestDocument, 'gameId');
    const gameTitle = firestoreString_(requestDocument, 'gameTitle') || 'la partida';
    if (dmUid !== uid) throw new Error('No tenés permisos para resolver esta solicitud.');

    const gameRecord = findGameWithRow_(gameId);
    assertOwner_(gameRecord && gameRecord.data, uid);

    if (currentStatus !== 'PENDING') {
      if (currentStatus === nextStatus) {
        if (currentStatus === 'APPROVED') {
          // Un reintento también repara el acceso de contacto de solicitudes
          // aceptadas con una versión anterior del backend.
          const repairTime = new Date();
          commitFirestoreWrites_(contactGrantWrites_(dmUid, playerUid, gameId, requestId, repairTime));
        }
        return {
          id: requestId,
          status: currentStatus,
          duplicate: true,
          currentPlayers: Number(gameRecord.data.jugadores_actuales || 0),
          maxPlayers: Number(gameRecord.data.cupos_totales || 0),
          message: currentStatus === 'APPROVED'
            ? 'Este jugador ya forma parte de la partida.'
            : 'Esta solicitud ya fue rechazada.'
        };
      }
      throw new Error('Esta solicitud ya fue resuelta.');
    }

    const now = new Date();
    const seenAt = firestoreTimestamp_(requestDocument, 'seenAt') || now;
    const notificationId = requestId + '-' + nextStatus.toLowerCase();
    const notification = {
      id: notificationId,
      type: nextStatus === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      title: nextStatus === 'APPROVED' ? '¡Estás dentro!' : 'Actualización de tu solicitud',
      message: nextStatus === 'APPROVED'
        ? 'Te aceptaron en “' + gameTitle + '”.'
        : 'Tu solicitud para “' + gameTitle + '” no fue aceptada.',
      gameId: gameId,
      gameTitle: gameTitle,
      requestId: requestId,
      actorUid: uid,
      read: false,
      createdAt: now
    };
    const requestUpdate = {
      status: nextStatus,
      seenByDm: true,
      seenAt: seenAt,
      resolvedAt: now,
      updatedAt: now
    };

    if (nextStatus === 'REJECTED') {
      commitFirestoreWrites_([
        firestoreUpdateWrite_('gameJoinRequests/' + requestId, requestUpdate),
        firestoreCreateWrite_('users/' + playerUid + '/notifications/' + notificationId, notification)
      ]);
      return { id: requestId, status: 'REJECTED', message: 'La solicitud fue rechazada.' };
    }

    const participantId = stableParticipantId_(gameId, playerUid);
    const existingParticipant = getFirestoreDocument_('gameParticipants/' + participantId);
    if (existingParticipant) {
      // El ID determinístico vuelve segura una repetición aunque el navegador
      // reenvíe la misma operación después de perder la respuesta.
      return {
        id: requestId,
        status: 'APPROVED',
        duplicate: true,
        currentPlayers: Number(gameRecord.data.jugadores_actuales || 0),
        maxPlayers: Number(gameRecord.data.cupos_totales || 0),
        message: 'Este jugador ya forma parte de la partida.'
      };
    }

    const game = gameRecord.data;
    const gameStatus = canonicalStatus_(game.estado);
    if (gameStatus === 'CANCELLED') throw new Error('La partida está cancelada.');
    const maxPlayers = integerBetween_(game.cupos_totales, 'cantidad máxima de jugadores', 1, 99);
    const currentPlayers = integerBetween_(game.jugadores_actuales || 0, 'jugadores confirmados', 0, maxPlayers);
    if (gameStatus === 'FULL' || currentPlayers >= maxPlayers) {
      throw new Error('La partida ya está completa.');
    }

    const updatedPlayers = currentPlayers + 1;
    const updatedStatus = updatedPlayers >= maxPlayers ? 'FULL' : gameStatus;
    const updatedGame = Object.assign({}, game, {
      jugadores_actuales: updatedPlayers,
      cupos_libres: Math.max(0, maxPlayers - updatedPlayers),
      estado: updatedStatus,
      publicada: updatedStatus === 'ACTIVE' || updatedStatus === 'FULL' ? 'Sí' : 'No',
      actualizada_el: now
    });
    const participant = {
      id: participantId,
      gameId: gameId,
      playerUid: playerUid,
      dmUid: uid,
      requestId: requestId,
      joinedAt: now
    };

    writeObjectRow_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, updatedGame, gameRecord.rowNumber);
    try {
      commitFirestoreWrites_([
        firestoreUpdateWrite_('gameJoinRequests/' + requestId, requestUpdate),
        firestoreCreateWrite_('gameParticipants/' + participantId, participant),
        firestoreCreateWrite_('users/' + playerUid + '/notifications/' + notificationId, notification)
      ].concat(
        contactGrantWrites_(uid, playerUid, gameId, requestId, now)
      ));
    } catch (error) {
      // Firestore y Sheets no comparten transacciones. Esta compensación evita
      // dejar un cupo ocupado si la relación de participante no fue confirmada.
      writeObjectRow_(CONFIG.gamesSpreadsheetId, CONFIG.sheets.games, game, gameRecord.rowNumber);
      throw error;
    }

    return {
      id: requestId,
      status: 'APPROVED',
      gameId: gameId,
      participantId: participantId,
      currentPlayers: updatedPlayers,
      maxPlayers: maxPlayers,
      availableSeats: Math.max(0, maxPlayers - updatedPlayers),
      gameStatus: updatedStatus,
      message: updatedStatus === 'FULL'
        ? 'Jugador aceptado. La mesa quedó completa.'
        : 'Jugador aceptado y cupo actualizado.'
    };
  } finally {
    lock.releaseLock();
  }
}

function firestoreDocumentsUrl_() {
  return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
    '/databases/(default)/documents';
}

function getFirestoreDocument_(path) {
  const response = UrlFetchApp.fetch(firestoreDocumentsUrl_() + '/' + path, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 404) return null;
  if (response.getResponseCode() !== 200) {
    throw new Error('No pudimos comprobar si ya existe la solicitud. Código HTTP: ' + response.getResponseCode());
  }
  return JSON.parse(response.getContentText());
}

function createFirestoreDocuments_(documents) {
  const writes = documents.map(function (item) { return firestoreCreateWrite_(item.path, item.data); });
  commitFirestoreWrites_(writes, 'Ya existe una solicitud para esta partida.');
}

function firestoreDocumentName_(path) {
  return 'projects/' + CONFIG.firebaseProjectId + '/databases/(default)/documents/' + path;
}

function firestoreCreateWrite_(path, data) {
  return {
    update: { name: firestoreDocumentName_(path), fields: firestoreFields_(data) },
    currentDocument: { exists: false }
  };
}

function firestoreUpdateWrite_(path, data) {
  return {
    update: { name: firestoreDocumentName_(path), fields: firestoreFields_(data) },
    updateMask: { fieldPaths: Object.keys(data) },
    currentDocument: { exists: true }
  };
}

function firestoreSetWrite_(path, data) {
  return {
    update: { name: firestoreDocumentName_(path), fields: firestoreFields_(data) }
  };
}

function firestoreDeleteWrite_(path) {
  return { delete: firestoreDocumentName_(path) };
}

/**
 * Lista documentos de una colección filtrados por un campo de texto.
 * Devuelve los documentos crudos de Firestore (con .name y .fields).
 */
function queryDocuments_(collectionId, fieldPath, value) {
  const response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
      '/databases/(default)/documents:runQuery',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldPath },
              op: 'EQUAL',
              value: { stringValue: value }
            }
          }
        }
      }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('No pudimos consultar Firestore. Código HTTP: ' + response.getResponseCode());
  }
  const rows = JSON.parse(response.getContentText());
  return rows.filter(function (row) { return Boolean(row.document); }).map(function (row) { return row.document; });
}

function commitFirestoreWrites_(writes, conflictMessage) {
  const response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
      '/databases/(default)/documents:commit',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ writes: writes }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    if (response.getResponseCode() === 409 && conflictMessage) throw new Error(conflictMessage);
    console.error(response.getContentText());
    throw new Error('No pudimos guardar la operación en Firestore. Código HTTP: ' + response.getResponseCode());
  }
}

function firestoreFields_(data) {
  const fields = {};
  Object.keys(data).forEach(function (key) { fields[key] = firestoreValue_(data[key]); });
  return fields;
}

function firestoreValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  return { stringValue: String(value === null || value === undefined ? '' : value) };
}

function firestoreString_(document, field) {
  const value = document && document.fields && document.fields[field];
  return value && value.stringValue ? String(value.stringValue) : '';
}

function firestoreTimestamp_(document, field) {
  const value = document && document.fields && document.fields[field];
  return value && value.timestampValue ? new Date(value.timestampValue) : null;
}

function countParticipantsForGame_(gameId) {
  const response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.firebaseProjectId) +
      '/databases/(default)/documents:runQuery',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'gameParticipants' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'gameId' },
              op: 'EQUAL',
              value: { stringValue: gameId }
            }
          },
          select: { fields: [{ fieldPath: '__name__' }] }
        }
      }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('No pudimos comprobar los participantes confirmados. Código HTTP: ' + response.getResponseCode());
  }
  const rows = JSON.parse(response.getContentText());
  return rows.filter(function (row) { return Boolean(row.document); }).length;
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
  const fields = firebaseProfileFields_(idToken, uid);
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

function requirePlayer_(idToken, uid) {
  const fields = firebaseProfileFields_(idToken, uid);
  const role = fields.role && fields.role.stringValue;
  const completed = fields.profileCompleted && fields.profileCompleted.booleanValue === true;
  const active = !fields.active || fields.active.booleanValue === true;
  if (!completed || !active || (role !== 'PLAYER' && role !== 'BOTH')) {
    throw new Error('Para solicitar unirte, tu perfil debe tener rol Jugador o Ambos.');
  }
}

function firebaseProfileFields_(idToken, uid) {
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
    throw new Error('No pudimos verificar tu perfil. Completá tus datos e intentá nuevamente.');
  }
  const document = JSON.parse(response.getContentText());
  return document.fields || {};
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
    writeObjectRow_(spreadsheetId, sheetName, object, rowNumber);
  } finally {
    lock.releaseLock();
  }
}

function writeObjectRow_(spreadsheetId, sheetName, object, rowNumber) {
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
