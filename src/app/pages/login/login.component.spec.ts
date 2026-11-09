import { describe, expect, it, vi } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
describe('login continuation', () => {
  function setup(returnUrl: string, complete = true) {
    const auth = {signInWithEmail: vi.fn().mockResolvedValue(undefined), signInWithGoogle: vi.fn().mockResolvedValue(undefined)};
    const profiles = {isOwnProfileComplete: vi.fn().mockResolvedValue(complete)};
    const router = {navigate: vi.fn().mockResolvedValue(true), navigateByUrl: vi.fn().mockResolvedValue(true)};
    const component = new LoginComponent(new FormBuilder(), auth as unknown as AuthService, profiles as unknown as ProfileService,
      {snapshot:{queryParamMap:convertToParamMap({returnUrl})}} as ActivatedRoute, router as unknown as Router);
    component.form.setValue({email:'player@example.test',password:'emulator-only'});
    return {component, auth, profiles, router};
  }
  it('returns to the shared game after email login', async () => {
    const {component, router} = setup('/partidas/PRT-DEMO-BASE');
    await component.login(); expect(router.navigateByUrl).toHaveBeenCalledWith('/partidas/PRT-DEMO-BASE');
  });
  it('keeps the destination during onboarding after Google login', async () => {
    const {component, router} = setup('/partidas/PRT-DEMO-BASE', false);
    await component.loginWithGoogle();
    expect(router.navigate).toHaveBeenCalledWith(['/completar-perfil'], {queryParams:{returnUrl:'/partidas/PRT-DEMO-BASE'}});
  });
  it.each(['https://example.test', '//example.test'])('rejects external return URL %s', url => {
    expect(setup(url).component.returnUrl).toBe('/perfil');
  });
});
