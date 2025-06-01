// test-email.js

import dotenv from 'dotenv';
import { sendAlertEmail } from './email.js';

dotenv.config();

async function main() {
  // 1) Define sample values for a “new post”
  const samplePostId      = 'TEST1234567890';
  const samplePostContent = 'This is a test Truth Social post to verify email functionality.';
  const sampleRating      = 3; // 1–5 stars

  console.log(`▶️  Sending test email for Post ID: ${samplePostId}`);

  // 2) Call sendAlertEmail
  await sendAlertEmail(samplePostId, samplePostContent, sampleRating);

  console.log('✅  Test email function complete. Check your inbox (and spam folder).');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Error running test-email.js:', err);
  process.exit(1);
});
