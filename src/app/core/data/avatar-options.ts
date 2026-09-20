export type AvatarType = 'ELF' | 'DWARF' | 'WARRIOR' | 'DRUID' | 'RANGER' | 'WIZARD';

export interface AvatarOption {
  value: AvatarType;
  label: string;
  description: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { value: 'ELF', label: 'Elfo/a', description: 'Perspicaz y elegante' },
  { value: 'DWARF', label: 'Enano/a', description: 'Firme y leal' },
  { value: 'WARRIOR', label: 'Guerrero/a', description: 'Valiente y decidido' },
  { value: 'DRUID', label: 'Druida', description: 'Conectado con la naturaleza' },
  { value: 'RANGER', label: 'Explorador/a', description: 'Siempre tras una nueva ruta' },
  { value: 'WIZARD', label: 'Mago/a', description: 'Curioso y creativo' }
];

export function avatarForUid(uid: string): AvatarType {
  const hash = Array.from(uid || 'cumbre20').reduce((total, character) => total + character.charCodeAt(0), 0);
  return AVATAR_OPTIONS[hash % AVATAR_OPTIONS.length].value;
}

export function isAvatarType(value: unknown): value is AvatarType {
  return AVATAR_OPTIONS.some(option => option.value === value);
}
