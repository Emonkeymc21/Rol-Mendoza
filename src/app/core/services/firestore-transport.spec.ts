import {describe, expect, it} from 'vitest';
import {requiresWebKitLongPolling} from './firestore-transport';
describe('Firestore transport compatibility',()=>{
  it.each([
    'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/27.2 Safari/605.1.15',
    'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
    'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/140.0 Mobile Safari/604.1'
  ])('uses the compatibility transport for WebKit: %s',ua=>expect(requiresWebKitLongPolling(ua)).toBe(true));
  it.each([
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
    'Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0',
    'Mozilla/5.0 (Linux) Gecko/20100101 Firefox/145.0'
  ])('preserves the default transport for %s',ua=>expect(requiresWebKitLongPolling(ua)).toBe(false));
});
