export interface PublicGameRow {
  partida_id: string;
  creada_el: string;
  titulo: string;
  sistema: string;
  master_usuario_id?: string;
  creador_email?: string;
  master_nombre: string;
  modalidad: string;
  ciudad?: string;
  zona_plataforma: string;
  fecha?: string;
  hora?: string;
  dia_horario: string;
  frecuencia: string;
  cupos_totales: number | string;
  cupos_libres: number | string;
  jugadores_actuales?: number | string;
  nivel: string;
  edad_requerida?: string;
  metodo_contacto?: string;
  tono: string;
  descripcion: string;
  herramientas_cuidado: string;
  estado: string;
  actualizada_el: string;
}

export interface PublicComment {
  comentario_id: string;
  fecha: string;
  partida_id: string;
  nombre_publico: string;
  comentario: string;
  respuesta_admin?: string;
}

export interface ApiMutationResult {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FULL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'received' | 'published';
  message: string;
  duplicate?: boolean;
  gameId?: string;
  participantId?: string;
  currentPlayers?: number;
  maxPlayers?: number;
  availableSeats?: number;
  gameStatus?: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FULL';
}
