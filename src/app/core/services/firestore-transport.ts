// Safari and all iOS browsers use WebKit. Keep the default transport on Blink/Gecko.
export function requiresWebKitLongPolling(userAgent: string): boolean {
  return /AppleWebKit/i.test(userAgent) &&
    (/iPad|iPhone|iPod/i.test(userAgent) || !/Chrome|Chromium|Edg\/|OPR\//i.test(userAgent));
}
