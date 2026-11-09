import {convertToParamMap} from '@angular/router';
import {readFilters, writeFilters} from './filter-url-state';
import {canonicalLocation, matchesLocation, normalizeSearch, splitLocation} from './mendoza-locations';
const defaults={q:'',city:'Todas',mode:'Todas'};
const schema={q:null,city:['Todas','Godoy Cruz','Guaymallén'],mode:['Todas','Online','Presencial','Mixto']};
describe('Shareable filters',()=>{
 it('round-trips accents, spaces, punctuation without inventing filters',()=>{
  const value={q:'Dragón & dados +20',city:'Guaymallén',mode:'Presencial'};
  const encoded=new URLSearchParams(writeFilters(value,defaults));
  expect(readFilters(convertToParamMap(Object.fromEntries(encoded)),defaults,schema)).toEqual(value);
 });
 it('uses first duplicate, ignores unknown values and resets omitted fields',()=>{
  expect(readFilters(convertToParamMap({q:['Fate','D&D'],city:'Unknown',mode:'<script>'}),defaults,schema)).toEqual({...defaults,q:'Fate'});
  expect(writeFilters(defaults,defaults)).toEqual({});
  expect(readFilters(convertToParamMap({}),defaults,schema)).toEqual(defaults);
 });
});
describe('Mendoza localities',()=>{
 it('normalizes accents, casing, whitespace and historical same-city aliases',()=>{
  expect(matchesLocation('  GUAYMALLEN ','Guaymallén')).toBe(true);
  expect(canonicalLocation('Ciudad')).toBe('Ciudad de Mendoza');
  expect(splitLocation('lujan')).toEqual({city:'Luján de Cuyo',otherCity:''});
  expect(normalizeSearch('  Dragón   de MAIPÚ ')).toBe('dragon de maipu');
 });
 it('keeps neighbouring departments distinct and handles Other honestly',()=>{
  expect(matchesLocation('Godoy Cruz','Ciudad de Mendoza')).toBe(false);
  expect(matchesLocation('Guaymallén','Godoy Cruz')).toBe(false);
  expect(matchesLocation('GUAYMALLEN','Otro')).toBe(false);
  expect(matchesLocation('San Rafael','Otro')).toBe(true);
  expect(matchesLocation('','Otro')).toBe(false);
 });
});
