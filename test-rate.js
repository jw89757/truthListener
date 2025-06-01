// test-rate.js

import { ratePostImpact } from './rate-truth.js';

async function main() {
  const samplePost = `It is my great honor to raise the Tariffs on steel and aluminum from 25% to 50%, effective Wednesday, June 4th. Our steel and aluminum industries are coming back like never before. This will be yet another BIG jolt of great news for our wonderful steel and aluminum workers. MAKE AMERICA GREAT AGAIN!`;
  
  console.log('▶️  Testing market‐impact rating for sample post:');
  console.log(samplePost, '\n');

  const rating = await ratePostImpact(samplePost);
  console.log(`\n⭐ ChatGPT returned a rating of: ${rating} (1–5)`);
}

main().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
