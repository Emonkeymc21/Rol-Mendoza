import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { DmGuard } from './dm.guard';
import { ProfileCompleteGuard } from './profile-complete.guard';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

describe('access and continuation guards', () => {
  const state = { url: '/partidas/PRT-DEMO-BASE?origen=compartir' } as RouterStateSnapshot;
  const route = {} as ActivatedRouteSnapshot;
  const router = { createUrlTree: vi.fn((commands, extras) => ({ commands, extras })) };
  const auth = (user: unknown) => ({ user$: of(user) }) as AuthService;
  const profiles = (role = 'PLAYER', complete = true) => ({
    getOwnProfile: async () => ({ role }), isOwnProfileComplete: async () => complete
  }) as ProfileService;

  it('preserves the full return URL for an anonymous visitor', async () => {
    const result = await firstValueFrom(new AuthGuard(auth(null), router as unknown as Router).canActivate(route, state));
    expect(result).toEqual({ commands: ['/ingresar'], extras: { queryParams: { returnUrl: state.url } } });
  });
  it('accepts an authenticated visitor', async () => {
    expect(await firstValueFrom(new AuthGuard(auth({uid:'player'}), router as unknown as Router).canActivate(route, state))).toBe(true);
  });
  it.each(['DM', 'BOTH'])('allows the %s role to publish', async role => {
    expect(await firstValueFrom(new DmGuard(auth({uid:'dm'}), profiles(role), router as unknown as Router).canActivate())).toBe(true);
  });
  it('rejects a player from DM routes', async () => {
    expect(await firstValueFrom(new DmGuard(auth({uid:'player'}), profiles(), router as unknown as Router).canActivate()))
      .toEqual({commands:['/perfil'], extras:{queryParams:{dmRequired:'1'}}});
  });
  it('requires onboarding and preserves the destination', async () => {
    expect(await firstValueFrom(new ProfileCompleteGuard(auth({uid:'player'}), profiles('PLAYER', false), router as unknown as Router).canActivate(route, state)))
      .toEqual({commands:['/completar-perfil'], extras:{queryParams:{returnUrl:state.url}}});
  });
});
