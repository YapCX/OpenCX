import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'verification');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

async function waitAndClick(page, selector) {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await page.click(selector);
}

async function testAuth() {
  console.log('Starting browser test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Test 1: Navigate to login page
    console.log('Test 1: Navigate to login page');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });
    await takeScreenshot(page, '01-login-page');

    // Check for company branding
    const hasLogo = await page.$('svg[class*="text-primary"]') !== null;
    const hasTitle = await page.evaluate(() => document.body.innerText.includes('OpenCX'));
    console.log(`  - Logo present: ${hasLogo}`);
    console.log(`  - Title present: ${hasTitle}`);

    // Test 2: Try invalid login
    console.log('\nTest 2: Invalid login credentials show error');
    await page.type('#email', 'invalid@test.com');
    await page.type('#password', 'wrongpassword');
    await takeScreenshot(page, '02-login-form-filled');

    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('Invalid') || document.body.innerText.includes('error'),
      { timeout: 10000 }
    ).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    await takeScreenshot(page, '03-login-error');

    const hasError = await page.evaluate(() => document.body.innerText.includes('Invalid'));
    console.log(`  - Error message shown: ${hasError}`);

    // Test 3: Sign up flow
    console.log('\nTest 3: Sign up flow');

    // Reload the page to start fresh
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });

    // Click sign up link
    const signUpLink = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Sign up') || b.textContent?.includes("Don't have")
      );
    });
    if (signUpLink) {
      await signUpLink.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot(page, '04-signup-mode');
    }

    // Fill in sign up form
    const testEmail = `test${Date.now()}@example.com`;
    await page.type('#email', testEmail);
    await page.type('#password', 'testpassword123');
    await takeScreenshot(page, '05-signup-form-filled');

    // Submit sign up
    await page.click('button[type="submit"]');
    console.log('  - Submitting sign up form...');

    // Wait for either redirect to dashboard or error
    await Promise.race([
      page.waitForNavigation({ timeout: 15000 }),
      page.waitForFunction(
        () => document.body.innerText.includes('Could not') || document.body.innerText.includes('Dashboard'),
        { timeout: 15000 }
      )
    ]).catch(() => {});

    await new Promise(resolve => setTimeout(resolve, 2000));
    await takeScreenshot(page, '06-after-signup');

    const currentUrl = page.url();
    console.log(`  - Current URL: ${currentUrl}`);

    if (currentUrl.includes('dashboard')) {
      console.log('  - Sign up successful, redirected to dashboard!');

      // Test 4: Logout
      console.log('\nTest 4: Logout functionality');
      await takeScreenshot(page, '07-dashboard');

      // Find and click logout button
      const logoutButton = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b =>
          b.textContent?.toLowerCase().includes('sign out') ||
          b.textContent?.toLowerCase().includes('logout')
        );
      });

      if (logoutButton) {
        await logoutButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await takeScreenshot(page, '08-after-logout');

        const afterLogoutUrl = page.url();
        console.log(`  - After logout URL: ${afterLogoutUrl}`);
        console.log(`  - Logout successful: ${afterLogoutUrl.includes('login')}`);
      } else {
        console.log('  - Logout button not found');
      }
    } else {
      console.log('  - Sign up may have failed or still on login page');
    }

    // Report console errors
    console.log('\n=== Console Errors ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(`  ERROR: ${err}`));
    } else {
      console.log('  No console errors detected');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test error:', error);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
}

testAuth();
