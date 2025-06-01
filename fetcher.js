// fetcher.js

import { PROFILE_URL } from './config.js'; 
// (We won’t actually use PROFILE_URL here, but we import it to keep consistency.)

/**
 * Fetches the most recent 20 “truths” from Trump’s account via the JSON API.
 * Returns an array of { id, timestamp, content } sorted newest→oldest.
 *
 * You must already be authenticated via Puppeteer (cookies set), so the GET will succeed.
 */
export async function fetchLatestTruths(page) {
  // 1) Compose the feed URL for the latest 20 posts (no max_id for “most recent”)
  const ACCOUNT_ID = '107780257626128497'; // Trump’s user ID
  const FEED_URL = `https://truthsocial.com/api/v1/accounts/${ACCOUNT_ID}/statuses` +
                   `?limit=20&exclude_replies=true&only_replies=false&with_muted=true`;

  // 2) Navigate directly to the JSON API (page.goto will send your cookies along)
  const response = await page.goto(FEED_URL, { waitUntil: 'networkidle2' });

  // 3) If HTTP status isn’t 200, log an error and return empty array
  if (!response || response.status() !== 200) {
    console.error(`❌ Feed API returned status ${response?.status()}`);
    return [];
  }

  // 4) Parse the JSON body
  let json;
  try {
    json = await response.json();
  } catch (err) {
    console.error('❌ Failed to parse feed JSON:', err);
    return [];
  }

  // 5) The endpoint returns an array of status objects (e.g. [ { id, created_at, content, … }, … ])
  if (!Array.isArray(json)) {
    console.error('⚠️ Unexpected feed JSON shape (not an array):', json);
    return [];
  }

  // 6) Map each raw status into { id, timestamp, content }.
  //    Check the actual field names. Typically:
  //      - id: “114600000000000000”
  //      - created_at: “2025-05-31T13:02:00Z”
  //      - content: "Here’s Trump’s latest truth…"
  const truths = json.map((status) => ({
    id: status.id || null,
    timestamp: status.created_at || status.timestamp || null,
    content: status.content || status.text || ''
  }));

  // 7) Sort by descending numeric ID (newest first)
  truths.sort((a, b) => {
    if (a.id && b.id) {
      return Number(b.id) - Number(a.id);
    }
    // Fallback: compare timestamps if IDs are not numeric
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return truths;
}
