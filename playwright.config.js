const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for Daily Confirmation Feature Tests
 * Tests verify the daily balance confirmation API call to Google Sheets
 */
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  
  // Number of test workers
  workers: 1,
  
  // Timeout for each test
  timeout: 30 * 1000,
  
  // Global timeout
  globalTimeout: 30 * 60 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Retry failed tests
  retries: 1,
  
  // Report configuration
  reporter: 'html',
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3000',
    
    // Browser action timeout
    actionTimeout: 15000,
    
    // Network idle timeout
    navigationTimeout: 15000,
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Locale
    locale: 'th-TH',
    
    // Timezone
    timezone: 'Asia/Bangkok'
  },
  
  // Browser configurations
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  
  // Web server configuration (optional, if needed)
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000
  }
});