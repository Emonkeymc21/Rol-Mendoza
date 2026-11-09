import {BehaviorSubject,of,throwError} from 'rxjs';
import {CommunityService} from './community.service';
describe('Profile list session recovery',()=>{
 it('keeps listening for new sessions after a Firestore permission/network failure',()=>{
  const user$=new BehaviorSubject<any>({uid:'player'});
  const profiles={watchOwnProfile:()=>of({}),isComplete:()=>true,watchProfiles:vi.fn().mockReturnValueOnce(throwError(()=>Error('permission-denied'))).mockReturnValue(of([])),watchExcludedUserIds:()=>of(new Set())};
  const service=new CommunityService({} as any,{user$} as any,profiles as any,{loading$:of(false),error$:of('')} as any);
  expect(service.playersErrorState.value).toContain('No pudimos');
  user$.next(null);user$.next({uid:'new-player'});
  expect(profiles.watchProfiles).toHaveBeenCalledTimes(2);expect(service.playersErrorState.value).toBe('');expect(service.playersLoadingState.value).toBe(false);
 });
});
