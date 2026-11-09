interface TestApiEnvironment {
  production: boolean;
  firebase: {projectId: string};
  emulators?: {host: string};
}

// Local API access is possible only in the dedicated, loopback-only demo build.
export function isIsolatedTestApi(url: string, config: TestApiEnvironment, origin: string): boolean {
  return !config.production && config.firebase.projectId === 'demo-cumbre20' &&
    config.emulators?.host === '127.0.0.1' && origin === 'http://127.0.0.1:4200' &&
    url === `${origin}/apps-script`;
}
