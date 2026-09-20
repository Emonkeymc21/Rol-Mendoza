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

export function splitLocation(city: string | null | undefined): { city: string; otherCity: string } {
  const normalized = String(city || '').trim();
  if (!normalized || STANDARD_MENDOZA_LOCATIONS.includes(normalized)) {
    return { city: normalized, otherCity: '' };
  }
  return { city: OTHER_LOCATION, otherCity: normalized };
}

export function resolveLocation(city: string, otherCity: string): string {
  return city === OTHER_LOCATION ? otherCity.trim() : city.trim();
}

export function matchesLocation(actualCity: string, selectedCity: string): boolean {
  if (selectedCity === 'Todas') return true;
  if (selectedCity === OTHER_LOCATION) return !STANDARD_MENDOZA_LOCATIONS.includes(actualCity);
  return actualCity === selectedCity;
}
