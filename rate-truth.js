// rate-truth.js

import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is not defined. Please create a .env file with OPENAI_API_KEY=your_key"
  );
}

// Instantiate the OpenAI client using the default export
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

/**
 * Given the text of a Truth Social post, ask ChatGPT to rate its
 * market impact on a 1–5 star scale. Returns a number (1–5).
 *
 * @param {string} postContent
 * @returns {Promise<number>}
 */
export async function ratePostImpact(postContent) {
  // 1) Build the prompt, substituting in the actual post text
  const userPrompt = `
You are a financial‐markets analyst with deep experience interpreting social‐media commentary and how it moves markets.
Your task: Given the following single Truth Social post content, evaluate **how much immediate impact** this post is likely to have on the U.S. or global equity markets.

- Rate it on a scale from **1 to 5 stars**, where:
  1. ★☆☆☆☆ = No or negligible market impact.
  2. ★★☆☆☆ = Minor / localized impact (affects a specific sector or a few stocks).
  3. ★★★☆☆ = Moderate impact (noticeable price movement in certain sectors or mid‐caps).
  4. ★★★★☆ = High impact (broad market movement, multi‐sector effects).
  5. ★★★★★ = Extreme impact (systemic or major macro risk/uncertainty, likely to move major indices).

- In your response, **only** output a single integer from 1 to 5 (no stars, no extra text).
- Do not include any other commentary—just the star rating (e.g., \`3\`).

Post:
“${postContent}”
  `.trim();

  try {
    // 2) Call the Chat Completion endpoint
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4o-mini', etc. depending on your access
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant specialized in financial markets.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 5
    });

    // 3) Extract the model’s text reply (should be a single digit “1” … “5”)
    const rawReply = response.choices[0].message.content.trim();
    const rating = parseInt(rawReply, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      console.warn(`⚠️ Unexpected rating format (“${rawReply}”). Defaulting to 1.`);
      return 1;
    }
    return rating;
  } catch (err) {
    console.error('❌ ChatGPT API error:', err);
    return 1; // Fallback to “1 star” if something goes wrong
  }
}
