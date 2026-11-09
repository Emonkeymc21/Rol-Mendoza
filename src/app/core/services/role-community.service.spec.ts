import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';
import {RoleCommunityService} from './role-community.service';
import {FirebaseService} from './firebase.service';
import {AuthService} from './auth.service';
describe('Public community timeout and recovery',()=>{
 afterEach(()=>vi.useRealTimers());
 it('bounds a stalled public read and can retry without changing private permissions',async()=>{
  vi.useFakeTimers();
  const loadFirestore=vi.fn().mockImplementationOnce(()=>new Promise(()=>{})).mockResolvedValue({api:{query:()=>({}),collection:()=>({}),where:()=>({}),getDocs:async()=>({docs:[]})},database:{}});
  TestBed.configureTestingModule({providers:[RoleCommunityService,{provide:FirebaseService,useValue:{loadFirestore}},{provide:AuthService,useValue:{}}]});
  const service=TestBed.inject(RoleCommunityService);
  const failed=firstValueFrom(service.getPublished());
  const assertion=expect(failed).rejects.toThrow('tiempo de espera');
  await vi.advanceTimersByTimeAsync(8000);await assertion;
  expect(await firstValueFrom(service.getPublished())).toEqual([]);expect(loadFirestore).toHaveBeenCalledTimes(2);
 });
});
