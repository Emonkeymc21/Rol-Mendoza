export const AVATAR_CLASS_VALUES = [
  'BARBARIAN', 'BARD', 'CLERIC', 'PALADIN', 'RANGER', 'ROGUE',
  'DRUID', 'FIGHTER', 'MONK', 'SORCERER', 'WARLOCK', 'WIZARD'
] as const;

export type AvatarClass = typeof AVATAR_CLASS_VALUES[number];

export interface AvatarClassOption {
  value: AvatarClass;
  label: string;
  description: string;
}

export const AVATAR_CLASS_OPTIONS: readonly AvatarClassOption[] = [
  { value: 'BARBARIAN', label: 'Bárbaro', description: 'Fuerza indomable' },
  { value: 'BARD', label: 'Bardo', description: 'Historias e inspiración' },
  { value: 'CLERIC', label: 'Clérigo', description: 'Fe y protección' },
  { value: 'PALADIN', label: 'Paladín', description: 'Honor y determinación' },
  { value: 'RANGER', label: 'Explorador', description: 'Instinto y aventura' },
  { value: 'ROGUE', label: 'Pícaro', description: 'Ingenio y precisión' },
  { value: 'DRUID', label: 'Druida', description: 'Naturaleza y cambio' },
  { value: 'FIGHTER', label: 'Guerrero', description: 'Coraje y disciplina' },
  { value: 'MONK', label: 'Monje', description: 'Equilibrio y voluntad' },
  { value: 'SORCERER', label: 'Hechicero', description: 'Magia interior' },
  { value: 'WARLOCK', label: 'Brujo', description: 'Misterio y poder' },
  { value: 'WIZARD', label: 'Mago', description: 'Conocimiento y magia' }
];

export function isAvatarClass(value: unknown): value is AvatarClass {
  return AVATAR_CLASS_VALUES.includes(value as AvatarClass);
}

export function avatarClassForUid(uid: string): AvatarClass {
  // FNV-1a: estable entre navegadores y suficientemente uniforme para 12 opciones.
  let hash = 2166136261;
  for (const character of uid || 'cumbre20') {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return AVATAR_CLASS_VALUES[(hash >>> 0) % AVATAR_CLASS_VALUES.length];
}

export function migrateLegacyAvatar(value: unknown, uid: string): AvatarClass {
  if (isAvatarClass(value)) return value;
  const legacy: Record<string, AvatarClass> = {
    ELF: 'RANGER', DWARF: 'FIGHTER', WARRIOR: 'FIGHTER',
    DRUID: 'DRUID', RANGER: 'RANGER', WIZARD: 'WIZARD'
  };
  return legacy[String(value || '')] || avatarClassForUid(uid);
}

export function avatarClassLabel(value: unknown): string {
  return AVATAR_CLASS_OPTIONS.find(option => option.value === value)?.label || 'Cumbre20';
}
