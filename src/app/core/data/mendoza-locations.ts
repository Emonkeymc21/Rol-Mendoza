export const OTHER_LOCATION = 'Otro';

export const MENDOZA_LOCATIONS: readonly string[] = [
  'Ciudad de Mendoza',
  'Godoy Cruz',
  'Guaymallén',
  'Luján de Cuyo',
  'Maipú',
  'San Martín',
  'Valle de Uco',
  OTHER_LOCATION
];

export const STANDARD_MENDOZA_LOCATIONS = MENDOZA_LOCATIONS.filter(location => location !== OTHER_LOCATION);

export function normalizeSearch(value: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function canonicalLocation(value: string): string {
  const key = normalizeSearch(value);
  // Historical profile values refer to these same localities, never to neighbouring departments.
  const aliases: Record<string, string> = { ciudad: 'Ciudad de Mendoza', 'lujan': 'Luján de Cuyo' };
  return STANDARD_MENDOZA_LOCATIONS.find(location => normalizeSearch(location) === key) || aliases[key] || value.trim();
}

export function splitLocation(city: string | null | undefined): { city: string; otherCity: string } {
  const normalized = canonicalLocation(String(city || ''));
  if (!normalized || STANDARD_MENDOZA_LOCATIONS.includes(normalized)) return { city: normalized, otherCity: '' };
  return { city: OTHER_LOCATION, otherCity: normalized };
}

export function resolveLocation(city: string, otherCity: string): string {
  return city === OTHER_LOCATION ? otherCity.trim() : city.trim();
}

export function matchesLocation(actualCity: string, selectedCity: string): boolean {
  if (selectedCity === 'Todas') return true;
  const actual = canonicalLocation(actualCity);
  if (selectedCity === OTHER_LOCATION) return Boolean(actual) && !STANDARD_MENDOZA_LOCATIONS.includes(actual);
  return normalizeSearch(actual) === normalizeSearch(canonicalLocation(selectedCity));
}
