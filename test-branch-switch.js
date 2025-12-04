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

async function testBranchSwitch() {
  console.log('Starting branch switch test...\n');

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
    console.log('=== Logging in ===');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });

    const testEmail = 'branchtest' + Math.floor(Math.random() * 100000) + '@test.com';
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
    await wait(4000);

    console.log('\n=== Test: Branch Selector in Sidebar ===');
    await takeScreenshot(page, 'branch-01-dashboard');

    const hasBranchSelector = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Head Office') || text.includes('HOF');
    });
    console.log('  Branch selector visible: ' + hasBranchSelector);

    const hasBranchName = await page.evaluate(() => {
      const elements = document.querySelectorAll('div');
      for (const el of elements) {
        if (el.textContent && el.textContent.includes('Head Office')) {
          return true;
        }
      }
      return false;
    });
    console.log('  Branch name displayed: ' + hasBranchName);

    await takeScreenshot(page, 'branch-02-sidebar-with-branch');

    console.log('\n=== Test Results ===');
    console.log('  Branch Selector: ' + (hasBranchSelector ? 'PASS' : 'FAIL'));
    console.log('  Branch Name: ' + (hasBranchName ? 'PASS' : 'FAIL'));

    console.log('\n=== Console Errors ===');
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(err => console.log('  ERROR: ' + err.slice(0, 200)));
    } else {
      console.log('  No console errors detected');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test error:', error);
    await takeScreenshot(page, 'branch-error');
  } finally {
    await browser.close();
  }
}

testBranchSwitch();
