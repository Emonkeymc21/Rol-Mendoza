import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 90000,
  snapshotPathTemplate:'{testDir}/../visual/{arg}{ext}',
  expect: { timeout: 20000 }, retries: 0,
  reporter: [['list'], ['html', {open:'never'}], ['json', {outputFile:'test-results/results.json'}]],
  use: {baseURL:'http://127.0.0.1:4200', screenshot:'only-on-failure', trace:'retain-on-failure'},
  projects: [
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'android-chromium',use:{...devices['Pixel 7']}},
    {name:'desktop-webkit',use:{...devices['Desktop Safari']}},
    {name:'iphone-webkit',use:{...devices['iPhone 13']}}
  ],
  webServer: [
    {command:'node tests/isolated-server.cjs',url:'http://127.0.0.1:4401/health',reuseExistingServer:false,env:{CUMBRE20_TEST_MODE:'1'}},
    {command:process.env.CUMBRE20_SSR_E2E==='1'?'node scripts/serve-ssr-test.cjs':'node scripts/serve-e2e.cjs',env:{PORT:'4200',CUMBRE20_TEST_MODE:'1'},url:'http://127.0.0.1:4200',reuseExistingServer:false,timeout:120000}
  ]
});
