import {firstValueFrom, of, Subject, throwError} from 'rxjs';
import {GameService} from './game.service';
import {GoogleAppsScriptService} from './google-apps-script.service';
import {AuthService} from './auth.service';
const row:any={partida_id:'PRT-DEMO',titulo:'Mesa',sistema:'Fate',modalidad:'Presencial',cupos_totales:4,cupos_libres:3,jugadores_actuales:1,descripcion:'Pública',estado:'ACTIVE'};
describe('Game cache success and failure boundaries',()=>{
 beforeEach(()=>sessionStorage.clear());
 it('does not cache a failed request as a successful empty list and retries',()=>{
  const response=new Subject<any[]>();const api={enabled:true,getGames:vi.fn(()=>response)};
  const service=new GameService(api as unknown as GoogleAppsScriptService,{} as AuthService);
  const values:any[]=[];service.getGames().subscribe(v=>values.push(v));
  response.error(Error('offline'));
  expect(values).toEqual([]);expect(sessionStorage.getItem('cumbre20-public-games')).toBeNull();
  api.getGames.mockReturnValue(of([]) as any);service.refresh();
  expect(values).toEqual([[]]);expect(JSON.parse(sessionStorage.getItem('cumbre20-public-games')!).games).toEqual([]);
 });
 it('shares list requests, retains last valid data after refresh failure',()=>{
  const response=new Subject<any[]>();const api={enabled:true,getGames:vi.fn(()=>response)};
  const service=new GameService(api as unknown as GoogleAppsScriptService,{} as AuthService);
  const values:any[]=[];service.getGames().subscribe(v=>values.push(v));service.getGames().subscribe();service.refresh();
  expect(api.getGames).toHaveBeenCalledTimes(1);response.next([row]);response.complete();
  const saved=sessionStorage.getItem('cumbre20-public-games');
  api.getGames.mockReturnValue(throwError(()=>Error('offline')) as any);service.refresh();
  expect(values.at(-1)[0].seats).toBe(3);expect(sessionStorage.getItem('cumbre20-public-games')).toBe(saved);
 });
 it('deduplicates in-flight detail requests and fetches fresh seats on next visit',async()=>{
  const response=new Subject<any>();const api={enabled:true,getGame:vi.fn(()=>response)};
  const service=new GameService(api as unknown as GoogleAppsScriptService,{} as AuthService);
  const one=firstValueFrom(service.getGame(row.partida_id));const two=firstValueFrom(service.getGame(row.partida_id));
  response.next(row);response.complete();expect(api.getGame).toHaveBeenCalledTimes(1);expect((await one)?.seats).toBe(3);await two;
  api.getGame.mockReturnValue(of({...row,cupos_libres:2}) as any);
  expect((await firstValueFrom(service.getGame(row.partida_id)))?.seats).toBe(2);
 });
 it('does not call a network failure a missing game',async()=>{
  const api={getGame:()=>throwError(()=>Error('offline'))};const service=new GameService(api as any,{} as AuthService);
  await expect(firstValueFrom(service.getGame('PRT-DEMO'))).rejects.toThrow('offline');
 });
});
