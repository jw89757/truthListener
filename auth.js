// auth.js

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import { loadJson, saveJson } from './utils.js';
import {
  COOKIE_PATH,
  CREDENTIALS_PATH,
  PUPPETEER_OPTIONS,
  HOMEPAGE_URL
} from './config.js';
import readline from 'readline';

/**
 * Launches Puppeteer in headful mode and waits for the user to manually log in.
 * After you confirm in the terminal, it saves cookies and returns { browser, page }.
 */
export async function getAuthenticatedBrowser() {
  // 1) Launch Puppeteer (headful) with real Chrome profile
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: '/Users/jinwu/Library/Application Support/Google/Chrome/Default',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // optional, but ensures real Chrome is used
    ...PUPPETEER_OPTIONS
  });
  const page = await browser.newPage();

  // 2) Try to reuse cookies if they already exist
  try {
    const cookies = await loadJson(COOKIE_PATH, null);
    if (Array.isArray(cookies) && cookies.length > 0) {
      await page.setCookie(...cookies);
      console.log('✅ Loaded cookies from disk');
    } else {
      console.log('⚠️ No cookies found on disk');
    }
  } catch (err) {
    console.log('⚠️ Error loading cookies (none found or invalid)', err);
  }

  // 3) Navigate to the homepage
  await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle2' });
  console.log(`► Browser opened at ${HOMEPAGE_URL}`);

  // 4) Check if already logged in (look for avatar or account menu, adjust as needed)
  const LOGGED_IN_AVATAR_SELECTOR = 'img[alt="Avatar"], div[aria-label="Account menu"], img[alt="Profile Picture"]';
  let isLoggedIn = false;
  try {
    await page.waitForSelector(LOGGED_IN_AVATAR_SELECTOR, { timeout: 5000 });
    isLoggedIn = true;
    console.log('✅ Already logged in via valid cookies (avatar found)');
  } catch {
    isLoggedIn = false;
    console.log('⚠️ Not logged in (avatar not found)');
  }

  // 5) If not logged in, instruct user to sign in manually
  if (!isLoggedIn) {
    console.log('');
    console.log('▶️  Please manually click “Sign In” in the browser window, enter your credentials, and complete the login.');
    console.log('   Once you see your account avatar (top‐right) or some indication you are logged in,');
    console.log('   come back here and press [Enter] to continue.');
    console.log('');

    // Wait for the user to press Enter in the terminal
    await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Press [Enter] once you have signed in manually…', () => {
        rl.close();
        resolve();
      });
    });

    // Optionally verify again that you are now signed in
    try {
      await page.waitForSelector(LOGGED_IN_AVATAR_SELECTOR, { timeout: 10000 });
      console.log('✅ Detected logged‐in state after manual login (avatar found)');
      isLoggedIn = true;
    } catch {
      console.error('⛔ Still no avatar detected after manual login. Exiting.');
      process.exit(1);
    }
  }

  // 6) Save cookies to disk for future runs
  const freshCookies = await page.cookies();
  await saveJson(COOKIE_PATH, freshCookies);
  console.log('✅ Cookies saved to disk at', COOKIE_PATH);

  return { browser, page };
}
