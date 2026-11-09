import {CommonModule} from '@angular/common';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject,of,ReplaySubject} from 'rxjs';
import {HomeComponent} from './home.component';
import {AuthService} from '../../core/services/auth.service';
import {ProfileService} from '../../core/services/profile.service';
import {CommunityService} from '../../core/services/community.service';
function setup(loaded:boolean){
 const players=new ReplaySubject<any[]>(1),loading=new BehaviorSubject(!loaded),error=new BehaviorSubject('');
 if(loaded)players.next([{id:'a',name:'A',systems:['Fate']},{id:'b',name:'B',systems:['Fate']}]);
 const community={getPlayers:()=>players,getGames:()=>of([]),playersLoading$:loading,playersLoadingState:loading,playersErrorState:error,gamesLoading$:of(false),gamesError$:of('')};
 TestBed.configureTestingModule({declarations:[HomeComponent],imports:[CommonModule,ReactiveFormsModule,RouterTestingModule],schemas:[NO_ERRORS_SCHEMA],providers:[{provide:CommunityService,useValue:community},{provide:AuthService,useValue:{user$:of({uid:'a'})}},{provide:ProfileService,useValue:{watchOwnProfile:()=>of({profileCompleted:true,role:'PLAYER'})}}]});
 const fixture=TestBed.createComponent(HomeComponent);fixture.detectChanges();
 const count=()=>{fixture.detectChanges();return fixture.nativeElement.querySelectorAll('.hero-ledger strong')[1].textContent.trim();};
 return {players,loading,error,count};
}
describe('Honest public activity counters',()=>{
 it('shows an already loaded profile count when returning Home',()=>{expect(setup(true).count()).toBe('2');});
 it('distinguishes pending/error from a successful real zero',()=>{
  const state=setup(false);expect(state.count()).toBe('—');
  state.error.next('offline');state.players.next([]);state.loading.next(false);expect(state.count()).toBe('—');
  state.error.next('');state.players.next([]);state.loading.next(false);expect(state.count()).toBe('0');
 });
});
