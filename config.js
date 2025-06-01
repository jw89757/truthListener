// config.js

import path from 'path';

export const PROFILE_URL       = 'https://truthsocial.com/@realDonaldTrump';
export const HOMEPAGE_URL      = 'https://truthsocial.com/';

export const COOKIE_PATH       = path.resolve('./cookies.json');
export const CREDENTIALS_PATH  = path.resolve('./credentials.json');
export const LASTSEEN_PATH     = path.resolve('./last-seen.json');

// Poll every 60 seconds: '*/60 * * * * *'
// (Adjust if you want e.g. every 30 seconds: '*/30 * * * * *')
export const CRON_SCHEDULE = '*/60 * * * * *';

// config.js

export const PUPPETEER_OPTIONS = {
    headless: false,                    // ← run with a visible Chrome window
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  };
  
