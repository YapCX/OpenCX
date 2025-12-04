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

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFeatures() {
  console.log('Starting feature tests...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('=== Logging in ===');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });

    const testEmail = 'admin' + Math.floor(Math.random() * 100000) + '@test.com';
    const signUpButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Sign up') || b.textContent?.includes("Don't have")
      );
    });
    if (signUpButton) {
      await signUpButton.click();
      await wait(500);
    }

    await page.type('#email', testEmail);
    await page.type('#password', 'testpassword123');
    await page.click('button[type="submit"]');
    await wait(3000);
    await takeScreenshot(page, 'feature-01-logged-in');

    console.log('\n=== Test: Audit Log Page ===');
    await page.goto('http://localhost:5175/audit', { waitUntil: 'networkidle2' });
    await wait(2000);
    await takeScreenshot(page, 'feature-02-audit-log');

    const auditPageContent = await page.evaluate(() => document.body.innerText);
    const hasAuditPage = auditPageContent.includes('Audit Log') || auditPageContent.includes('Track all user actions');
    console.log('  Audit Log page accessible: ' + hasAuditPage);

    console.log('\n=== Test: User Management (Deactivation) ===');
    await page.goto('http://localhost:5175/settings?tab=users', { waitUntil: 'networkidle2' });
    await wait(2000);
    await takeScreenshot(page, 'feature-03-users-page');

    const usersPageContent = await page.evaluate(() => document.body.innerText);
    const hasUsersPage = usersPageContent.includes('Users') && (usersPageContent.includes('Add User') || usersPageContent.includes('Active'));
    console.log('  Users management page accessible: ' + hasUsersPage);

    const hasActiveToggle = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent === 'Active' || b.textContent === 'Inactive');
    });
    console.log('  Active/Inactive toggle buttons present: ' + hasActiveToggle);

    console.log('\n=== Verifying Audit Log Content ===');
    await page.goto('http://localhost:5175/audit', { waitUntil: 'networkidle2' });
    await wait(2000);

    const auditHasContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Total Events') && (text.includes('User') || text.includes('Today'));
    });
    console.log('  Audit Log has stats cards: ' + auditHasContent);
    await takeScreenshot(page, 'feature-04-audit-log-content');

    console.log('\n=== Checking UI Components ===');
    await page.goto('http://localhost:5175/dashboard', { waitUntil: 'networkidle2' });
    await wait(2000);
    await takeScreenshot(page, 'feature-05-dashboard');

    console.log('\n=== Test Results ===');
    console.log('  Audit Log Page: ' + (hasAuditPage ? 'PASS' : 'FAIL'));
    console.log('  Users Management: ' + (hasUsersPage ? 'PASS' : 'FAIL'));
    console.log('  User Active Toggle: ' + (hasActiveToggle ? 'PASS' : 'FAIL'));

    console.log('\n=== Console Errors ===');
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(err => console.log('  ERROR: ' + err.slice(0, 200)));
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

testFeatures();
