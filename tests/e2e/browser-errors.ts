import { expect, type Page, type TestInfo } from '@playwright/test';

type BrowserError = { kind: string; message: string; stack: string; url?: string };

export async function observeBrowserErrors(page: Page, info: TestInfo, artifact = 'browser-errors') {
  const exceptions: BrowserError[] = [];
  const protocol: BrowserError[] = [];
  await page.exposeBinding('__cumbre20QaException', ({ frame }, error: BrowserError) => {
    exceptions.push({ ...error, url: frame.url() });
  });
  await page.addInitScript(() => {
    const report = (error: { kind: string; message: string; stack: string }) => {
      const target = window as Window & { __cumbre20QaException: (value: unknown) => Promise<void> };
      void target.__cumbre20QaException(error);
    };
    window.addEventListener('error', event => {
      if (event instanceof ErrorEvent) report({ kind: 'error', message: event.message, stack: String(event.error?.stack || '') });
    });
    window.addEventListener('unhandledrejection', event => {
      report({ kind: 'unhandledrejection', message: String(event.reason?.message || event.reason), stack: String(event.reason?.stack || '') });
    });
  });
  page.on('pageerror', error => protocol.push({ kind: error.name, message: error.message, stack: error.stack || '' }));

  // WebKit reports handled WebChannel network shutdown messages as JavaScript
  // console errors; Playwright promotes every such message to pageerror. They
  // are not ErrorEvents/unhandledrejections. Their stacks describe the fetch
  // call, not a thrown exception. Keep all evidence and reject every other
  // protocol error; native exceptions always fail even with matching text.
  // https://github.com/firebase/firebase-js-sdk/issues/4527
  // playwright-core/lib/coreBundle.js: WebKit _onConsoleMessage
  const isWebKitChannelDiagnostic = (error: BrowserError) =>
    page.context().browser()?.browserType().name() === 'webkit' && error.kind === 'Fetch API cannot load http' &&
    /^\/{1,2}127\.0\.0\.1:8080\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel\?/.test(error.message) &&
    error.message.includes('projects%2Fdemo-cumbre20%2Fdatabases%2F(default)') &&
    error.message.endsWith(' due to access control checks.');

  return {
    exceptions,
    protocol,
    async assertClean() {
      const networkDiagnostics = protocol.filter(isWebKitChannelDiagnostic);
      const unexpectedProtocol = protocol.filter(error => !isWebKitChannelDiagnostic(error));
      await info.attach(`${artifact}.json`, {
        body: JSON.stringify({ exceptions, protocol, networkDiagnostics, unexpectedProtocol }, null, 2),
        contentType: 'application/json'
      });
      console.log(`${artifact}: native=${exceptions.length}, unexpectedProtocol=${unexpectedProtocol.length}, recordedNetworkDiagnostics=${networkDiagnostics.length}`);
      expect(exceptions, 'Native browser exceptions and unhandled promises').toEqual([]);
      expect(unexpectedProtocol, 'Unexpected Playwright page errors').toEqual([]);
    }
  };
}
