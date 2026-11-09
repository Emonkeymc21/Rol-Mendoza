import {describe, expect, it} from 'vitest';
import {isIsolatedTestApi} from './isolated-test-api';
const demo={production:false,firebase:{projectId:'demo-cumbre20'},emulators:{host:'127.0.0.1'}};
const origin='http://127.0.0.1:4200';
describe('isolated API boundaries',()=>{
  it('permits the dedicated local demo endpoint',()=>expect(isIsolatedTestApi(`${origin}/apps-script`,demo,origin)).toBe(true));
  it('rejects the production build even with demo-like configuration',()=>expect(isIsolatedTestApi(`${origin}/apps-script`,{...demo,production:true},origin)).toBe(false));
  it('rejects a real Firebase project and a missing emulator configuration',()=>{
    expect(isIsolatedTestApi(`${origin}/apps-script`,{...demo,firebase:{projectId:'rol-mendoza'}},origin)).toBe(false);
    expect(isIsolatedTestApi(`${origin}/apps-script`,{production:false,firebase:demo.firebase},origin)).toBe(false);
  });
  it.each(['https://example.test/apps-script','http://localhost:4200/apps-script',`${origin}/another-api`])('rejects an unapproved endpoint %s',url=>expect(isIsolatedTestApi(url,demo,origin)).toBe(false));
});
