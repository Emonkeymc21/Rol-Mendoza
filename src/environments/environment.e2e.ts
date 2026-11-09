// Compiled only by `ng serve --configuration=e2e`. No production credentials.
export const environment = {
  production: false,
  appsScript: {webAppUrl:'https://script.google.com/macros/s/EMULATOR_ONLY/exec'},
  firebase: {
    apiKey:'emulator-only-key',authDomain:'demo-cumbre20.firebaseapp.com',
    projectId:'demo-cumbre20',appId:'1:123:web:emulator-only'
  },
  emulators: {host:'127.0.0.1',authPort:9099,firestorePort:4200}
};
