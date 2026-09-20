export interface PublicGameRow {
  partida_id: string;
  creada_el: string;
  titulo: string;
  sistema: string;
  master_usuario_id?: string;
  master_nombre: string;
  modalidad: string;
  zona_plataforma: string;
  dia_horario: string;
  frecuencia: string;
  cupos_totales: number | string;
  cupos_libres: number | string;
  nivel: string;
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
  status: 'pending' | 'received' | 'published';
  message: string;
}
