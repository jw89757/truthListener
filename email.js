// email.js

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

// ───────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────────

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is not set');
}

const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_TO   = process.env.EMAIL_TO;
if (!EMAIL_FROM || !EMAIL_TO) {
  throw new Error('EMAIL_FROM and EMAIL_TO environment variables must be set');
}

// Initialize SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * sendAlertEmail:
 * Sends an email alert whenever a new Truth Social post is detected and rated.
 *
 * @param {string} postId       - The unique ID of the Truth Social post.
 * @param {string} postContent  - The content/text of the new post.
 * @param {number} rating       - Market impact rating (1–5 stars).
 */
export async function sendAlertEmail(postId, postContent, rating) {
  // Construct the post URL (assumes Trump’s handle is @realDonaldTrump)
  const postUrl = `https://truthsocial.com/@realDonaldTrump/posts/${postId}`;

  // Put the star rating at the very front of the subject
  const subject = `${rating}★ New Truth Social Post (ID: ${postId})`;

  // Plain-text version
  const textBody = `
You have a new Truth Social post (ID: ${postId}), rated ${rating} out of 5 for market impact.

You can view it here:
${postUrl}

Post Content:
${postContent}

---
This is an automated alert from your TruthListener service.
`;

  // HTML version with minimal styling
  const htmlBody = `
    <div style="font-family:Arial, sans-serif; color:#333;">
      <h2 style="font-size:18px; margin-bottom:8px;">
        ${rating} <span style="color:#FFD700;">★</span> New Truth Social Post Detected
      </h2>
      <p><strong>ID:</strong> ${postId}</p>
      <p><strong>Market Impact Rating:</strong> ${rating} <span style="color:#FFD700;">★</span></p>
      <p>
        <strong>View Post:</strong>
        <a href="${postUrl}" target="_blank" style="color:#1a0dab; text-decoration:none;">
          ${postUrl}
        </a>
      </p>
      <hr style="border:none; border-top:1px solid #ddd; margin:12px 0;">
      <p><strong>Post Content:</strong></p>
      <blockquote style="font-style:italic; margin-left:16px; color:#555;">
        ${postContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </blockquote>
      <hr style="border:none; border-top:1px solid #ddd; margin:12px 0;">
      <p style="font-size:12px; color:#888;">
        This is an automated notification from your TruthListener service.
      </p>
    </div>
  `;

  const msg = {
    to: EMAIL_TO.split(',').map((s) => s.trim()),
    from: EMAIL_FROM,
    subject,
    text: textBody.trim(),
    html: htmlBody
  };

  try {
    await sgMail.send(msg);
    console.log(`✉️  Email sent for post ID ${postId} (rating: ${rating}★)`);
  } catch (err) {
    console.error(`❌  Failed to send email for post ID ${postId}:`, err);
  }
}
