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

async function testSession() {
  console.log('Starting comprehensive test session...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('InvalidAccountId')) {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('=== Step 1: Login ===');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });

    const testEmail = 'session' + Math.floor(Math.random() * 100000) + '@test.com';
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

    // Wait longer for full page load and data initialization
    await wait(5000);
    await takeScreenshot(page, 'session-01-dashboard');

    // Check for branch selector
    console.log('\n=== Step 2: Check Branch Selector ===');

    const pageContent = await page.evaluate(() => document.body.innerText);
    console.log('Page includes "Head Office": ' + pageContent.includes('Head Office'));
    console.log('Page includes "HOF": ' + pageContent.includes('HOF'));

    // Check if there's a MapPin icon (branch selector)
    const hasBranchUI = await page.evaluate(() => {
      // Look for branch selector by checking for branch code pattern
      const allText = document.body.innerText;
      return allText.includes('HOF') || allText.includes('Head Office');
    });
    console.log('Branch selector visible: ' + hasBranchUI);

    // Navigate to settings to create a second branch for testing
    console.log('\n=== Step 3: Create Second Branch for Testing ===');
    await page.goto('http://localhost:5175/settings?tab=branches', { waitUntil: 'networkidle2' });
    await wait(3000);
    await takeScreenshot(page, 'session-02-branches');

    // Check if we can access settings (admin only)
    const settingsContent = await page.evaluate(() => document.body.innerText);
    if (settingsContent.includes('Branches') && settingsContent.includes('Add Branch')) {
      console.log('Settings page accessible (admin user)');

      // Click Add Branch button
      const addBranchButton = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b =>
          b.textContent?.includes('Add Branch')
        );
      });

      if (addBranchButton) {
        await addBranchButton.click();
        await wait(1000);
        await takeScreenshot(page, 'session-03-add-branch-modal');

        // Fill in branch details
        const codeInput = await page.$('input[placeholder="HOF"]');
        const nameInput = await page.$('input[placeholder="Head Office"]');

        if (codeInput && nameInput) {
          await codeInput.type('DT1');
          await nameInput.type('Downtown Branch');
          await takeScreenshot(page, 'session-04-branch-form-filled');

          // Submit
          const submitBtn = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(b =>
              b.textContent === 'Add Branch'
            );
          });
          if (submitBtn) {
            await submitBtn.click();
            await wait(2000);
          }
        }
      }
    } else if (settingsContent.includes('Access denied') || !settingsContent.includes('Branches')) {
      console.log('User is not admin - cannot access settings');
    }

    // Go back to dashboard and check branch selector
    console.log('\n=== Step 4: Verify Branch Selector on Dashboard ===');
    await page.goto('http://localhost:5175/dashboard', { waitUntil: 'networkidle2' });
    await wait(3000);
    await takeScreenshot(page, 'session-05-final-dashboard');

    const finalContent = await page.evaluate(() => document.body.innerText);
    const hasBranchSelector = finalContent.includes('Head Office') || finalContent.includes('HOF') || finalContent.includes('Downtown');
    console.log('Branch selector with branches: ' + hasBranchSelector);

    // Test Audit Log access
    console.log('\n=== Step 5: Test Audit Log ===');
    await page.goto('http://localhost:5175/audit', { waitUntil: 'networkidle2' });
    await wait(2000);
    await takeScreenshot(page, 'session-06-audit');

    const auditContent = await page.evaluate(() => document.body.innerText);
    const hasAuditLog = auditContent.includes('Audit Log') || auditContent.includes('Track all user actions');
    console.log('Audit Log accessible: ' + hasAuditLog);

    // Test Users page for deactivation
    console.log('\n=== Step 6: Test User Management ===');
    await page.goto('http://localhost:5175/settings?tab=users', { waitUntil: 'networkidle2' });
    await wait(2000);
    await takeScreenshot(page, 'session-07-users');

    const usersContent = await page.evaluate(() => document.body.innerText);
    const hasUserManagement = usersContent.includes('Users') && (usersContent.includes('Add User') || usersContent.includes('Active'));
    console.log('User Management accessible: ' + hasUserManagement);

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Branch Selector: ' + (hasBranchSelector ? 'PASS' : 'FAIL - check if branches exist'));
    console.log('Audit Log: ' + (hasAuditLog ? 'PASS' : 'FAIL - may need admin role'));
    console.log('User Management: ' + (hasUserManagement ? 'PASS' : 'FAIL - may need admin role'));

    console.log('\n=== Console Errors ===');
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(err => console.log('  ERROR: ' + err.slice(0, 200)));
    } else {
      console.log('  No console errors detected');
    }

  } catch (error) {
    console.error('Test error:', error);
    await takeScreenshot(page, 'session-error');
  } finally {
    await browser.close();
  }
}

testSession();
