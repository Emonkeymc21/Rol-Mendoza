import { afterEach, describe, expect, it, vi } from 'vitest';
import { disableNetwork, enableNetwork, type Firestore } from 'firebase/firestore';
import { bindFirestorePageLifecycle } from './firestore-page-lifecycle';

vi.mock('firebase/firestore', () => ({
  disableNetwork: vi.fn().mockResolvedValue(undefined),
  enableNetwork: vi.fn().mockResolvedValue(undefined)
}));

describe('Firestore document lifecycle', () => {
  const database = {} as Firestore;
  afterEach(() => vi.clearAllMocks());

  it('leaves the initial pageshow and background visibility changes alone', () => {
    const page = new EventTarget();
    const dispose = bindFirestorePageLifecycle(database, page);
    page.dispatchEvent(new Event('pageshow'));
    page.dispatchEvent(new Event('visibilitychange'));
    expect(disableNetwork).not.toHaveBeenCalled();
    expect(enableNetwork).not.toHaveBeenCalled();
    dispose();
  });

  it('pauses on document exit and resumes the cached document once', () => {
    const page = new EventTarget();
    const dispose = bindFirestorePageLifecycle(database, page);
    page.dispatchEvent(new Event('pagehide'));
    expect(disableNetwork).toHaveBeenCalledWith(database);
    page.dispatchEvent(new Event('pageshow'));
    page.dispatchEvent(new Event('pageshow'));
    expect(enableNetwork).toHaveBeenCalledExactlyOnceWith(database);
    expect(vi.mocked(disableNetwork).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(enableNetwork).mock.invocationCallOrder[0]);
    dispose();
  });

  it('can pause and resume again after another history navigation', () => {
    const page = new EventTarget();
    const dispose = bindFirestorePageLifecycle(database, page);
    for (let i = 0; i < 2; i++) {
      page.dispatchEvent(new Event('pagehide'));
      page.dispatchEvent(new Event('pageshow'));
    }
    expect(disableNetwork).toHaveBeenCalledTimes(2);
    expect(enableNetwork).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('removes both listeners when disposed', () => {
    const page = new EventTarget();
    const dispose = bindFirestorePageLifecycle(database, page);
    dispose();
    page.dispatchEvent(new Event('pagehide'));
    page.dispatchEvent(new Event('pageshow'));
    expect(disableNetwork).not.toHaveBeenCalled();
    expect(enableNetwork).not.toHaveBeenCalled();
  });
});
