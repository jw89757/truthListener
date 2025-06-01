// index.js

import cron from 'node-cron';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

import { loadJson, saveJson } from './utils.js';
import { getAuthenticatedBrowser } from './auth.js';
import { fetchLatestTruths } from './fetcher.js';
import { ratePostImpact } from './rate-truth.js';
import { sendAlertEmail } from './email.js';          // <-- Import the new module
import { LASTSEEN_PATH, CRON_SCHEDULE } from './config.js';

dotenv.config();

// ───────────────────────────────────────────────────────────────────────────────
// PATHS & HELPERS FOR SAVING POSTS / RATINGS
// ───────────────────────────────────────────────────────────────────────────────

const SAVED_CONTENT_PATH   = path.resolve('./saved-truth-texts.txt');
const RATING_OUTPUT_PATH   = path.resolve('./truth-impact-ratings.json');

// Append a new post’s content to saved-truth-texts.txt
async function appendOnlyTextContent(newPosts) {
  const lines = newPosts.map((t) => `---\n${t.content}\n`);
  await fs.appendFile(SAVED_CONTENT_PATH, lines.join('\n'), 'utf-8');
}

// Append { id, rating, timestamp } to truth-impact-ratings.json
async function saveImpactRating(postId, starRating) {
  let existing = [];
  try {
    const raw = await fs.readFile(RATING_OUTPUT_PATH, 'utf-8');
    existing = JSON.parse(raw);
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }
  existing.push({
    id: postId,
    rating: starRating,
    evaluatedAt: new Date().toISOString()
  });
  await fs.writeFile(RATING_OUTPUT_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

// ───────────────────────────────────────────────────────────────────────────────
// MAIN POLLING + RATING + EMAIL LOGIC
// ───────────────────────────────────────────────────────────────────────────────

async function startPolling() {
  // 1) Launch Puppeteer & authenticate
  const { browser, page } = await getAuthenticatedBrowser();

  // 2) Load last-seen post ID
  const lastSeenData = await loadJson(LASTSEEN_PATH, { lastTruthId: null });
  let lastTruthId = lastSeenData.lastTruthId;

  // 3) Initial fetch to prime saved‐text & ratings files
  const initialTruths = await fetchLatestTruths(page);
  if (initialTruths.length > 0 && !lastTruthId) {
    const top20 = initialTruths.slice(0, 20);

    // Initialize saved‐text file if missing/empty
    try {
      const existing = await fs.readFile(SAVED_CONTENT_PATH, 'utf-8');
      if (existing.trim().length === 0) {
        await appendOnlyTextContent(top20);
        console.log(`✅ Initialized saved‐text file with ${top20.length} posts`);
      }
    } catch {
      await fs.writeFile(SAVED_CONTENT_PATH, '', 'utf-8');
      await appendOnlyTextContent(top20);
      console.log(`✅ Created saved‐text file and added ${top20.length} posts`);
    }

    // Initialize ratings file if missing/invalid
    try {
      const existingRatings = await fs.readFile(RATING_OUTPUT_PATH, 'utf-8');
      if (!Array.isArray(JSON.parse(existingRatings))) {
        await fs.writeFile(RATING_OUTPUT_PATH, '[]', 'utf-8');
      }
    } catch {
      await fs.writeFile(RATING_OUTPUT_PATH, '[]', 'utf-8');
    }

    // Set lastTruthId to the newest of those 20
    lastTruthId = top20[0].id;
    await saveJson(LASTSEEN_PATH, { lastTruthId });
    console.log(`Initialized lastTruthId → ${lastTruthId}`);
  }

  // 4) Schedule the cron job
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      console.log('🔍 Checking for new truths…');
      const truths = await fetchLatestTruths(page);

      if (truths.length === 0) {
        console.warn('⚠️ No posts found (endpoint may have changed)');
        return;
      }

      const newest = truths[0];
      if (newest.id !== lastTruthId) {
        // Collect all “newer” posts since lastTruthId
        const newOnes = [];
        for (const t of truths) {
          if (t.id === lastTruthId) break;
          newOnes.push(t);
        }

        // Process in chronological order (oldest → newest)
        newOnes.reverse().forEach(async (t) => {
          console.log('📢 NEW TRUTH DETECTED:');
          console.log(`  • ID: ${t.id}`);
          console.log(`  • Time: ${t.timestamp}`);
          console.log(`  • Content: ${t.content}\n`);

          // (1) Save raw text
          await appendOnlyTextContent([t]);
          console.log(`✅ Saved text for ID ${t.id}`);

          // (2) Rate market impact (1–5 stars)
          const star = await ratePostImpact(t.content);
          console.log(`⭐ Market impact rating for ${t.id}: ${star}`);

          // (3) Save that rating to JSON
          await saveImpactRating(t.id, star);
          console.log(`✅ Saved rating for ID ${t.id} to ${RATING_OUTPUT_PATH}`);

          // (4) Send email alert (using sendAlertEmail from email.js)
          await sendAlertEmail(t.id, t.content, star);
        });

        // Update lastTruthId so we skip these next time
        lastTruthId = newest.id;
        await saveJson(LASTSEEN_PATH, { lastTruthId });
        console.log(`✅ Updated lastTruthId → ${lastTruthId}`);
      } else {
        console.log('⏳ No new posts since last check.');
      }
    } catch (err) {
      console.error('❌ Error during polling:', err);
    }
  });

  // 5) (Optional) Expose an HTTP endpoint for debugging / fetching latest posts
  const app = express();
  app.get('/latest20', async (req, res) => {
    try {
      const truths = await fetchLatestTruths(page);
      return res.json({ latest: truths });
    } catch (e) {
      return res.status(500).json({ error: e.toString() });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Express server running on http://localhost:${PORT}`);
    console.log(`👉 GET /latest20 to see Trump’s 20 most recent posts`);
  });
}

startPolling().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
