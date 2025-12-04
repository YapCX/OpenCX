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

async function testAdminFeatures() {
  console.log('Starting admin features test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // Use the first test user which should be admin
    console.log('=== Login with admin@test.com ===');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });
    await wait(1000);

    await page.type('#email', 'admin@test.com');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    await wait(4000);

    // Check if we're on the dashboard
    const url = page.url();
    console.log('Current URL: ' + url);
    await takeScreenshot(page, 'admin-01-login-attempt');

    if (url.includes('/dashboard') || url.includes('/pos')) {
      console.log('Login successful!');

      // Check for Admin menu
      const hasAdminMenu = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Admin');
      });
      console.log('Has Admin menu: ' + hasAdminMenu);

      // Check for branch selector
      const hasBranchSelector = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Head Office') || text.includes('HOF');
      });
      console.log('Has Branch selector: ' + hasBranchSelector);

      // Navigate to Audit Log if admin
      if (hasAdminMenu) {
        console.log('\n=== Navigate to Audit Log ===');
        await page.goto('http://localhost:5175/audit', { waitUntil: 'networkidle2' });
        await wait(3000);
        await takeScreenshot(page, 'admin-02-audit-log');

        const auditContent = await page.evaluate(() => document.body.innerText);
        const hasAuditLog = auditContent.includes('Audit Log') && auditContent.includes('Total Events');
        console.log('Audit Log page works: ' + hasAuditLog);

        // Navigate to Users page
        console.log('\n=== Navigate to User Management ===');
        await page.goto('http://localhost:5175/settings?tab=users', { waitUntil: 'networkidle2' });
        await wait(3000);
        await takeScreenshot(page, 'admin-03-users');

        const usersContent = await page.evaluate(() => document.body.innerText);
        const hasUsersPage = usersContent.includes('Users') && usersContent.includes('Add User');
        console.log('Users Management page works: ' + hasUsersPage);

        // Check for Active/Inactive toggle
        const hasToggle = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(b => b.textContent === 'Active' || b.textContent === 'Inactive');
        });
        console.log('Has user active/inactive toggle: ' + hasToggle);
      }

      // Test Branch Selector
      console.log('\n=== Test Branch Selector ===');
      await page.goto('http://localhost:5175/dashboard', { waitUntil: 'networkidle2' });
      await wait(2000);
      await takeScreenshot(page, 'admin-04-dashboard-branch');

      // Click on branch selector if it exists
      const branchSelector = await page.evaluateHandle(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.innerText.includes('Head Office') || btn.innerText.includes('HOF')) {
            return btn;
          }
        }
        return null;
      });

      if (branchSelector) {
        console.log('Branch selector found - attempting to click');
        const isClickable = await page.evaluate((el) => !!el, branchSelector);
        if (isClickable) {
          await branchSelector.click();
          await wait(1000);
          await takeScreenshot(page, 'admin-05-branch-dropdown');
        }
      }

      console.log('\n=== TEST RESULTS ===');
      console.log('Branch Selector: ' + (hasBranchSelector ? 'PASS' : 'FAIL'));
      console.log('Admin Menu: ' + (hasAdminMenu ? 'PASS' : 'FAIL'));

    } else {
      console.log('Login may have failed or user does not exist');
      await takeScreenshot(page, 'admin-login-failed');
    }

  } catch (error) {
    console.error('Test error:', error);
    await takeScreenshot(page, 'admin-error');
  } finally {
    await browser.close();
  }
}

testAdminFeatures();
