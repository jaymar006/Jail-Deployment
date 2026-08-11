const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Load environment variables from backend/.env — same pattern as testBackup.js
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { google } = require('googleapis');
const logger = require('../utils/logger');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = process.env.GOOGLE_OAUTH_TOKEN_PATH || path.join(__dirname, '..', 'google-drive-token.json');
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  logger.error('❌ Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in backend/.env');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline', // required to receive a refresh_token
  prompt: 'consent',      // forces Google to re-issue a refresh_token even on repeat runs
  scope: SCOPES,
});

console.log('\n1. Open this URL in a browser (on your own machine — this can be run from anywhere, not just the VPS):\n');
console.log(authUrl);
console.log('\n2. Sign in with the Google account that owns the target Drive folder.');
console.log('3. Approve access — you will be redirected back here automatically.\n');
console.log('Waiting for authorization...\n');

const server = http
  .createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, REDIRECT_URI);
      const code = reqUrl.searchParams.get('code');

      if (!code) {
        res.end('No authorization code received. You can close this tab.');
        return;
      }

      res.end('✅ Authorization complete — you can close this tab and return to the terminal.');
      server.close();

      const { tokens } = await oAuth2Client.getToken(code);

      // Saved locally too, purely as a dev-time convenience/fallback — this
      // file does NOT persist on Render's ephemeral disk, so it's not what
      // production actually relies on.
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      logger.info(`✅ Token also saved locally to: ${TOKEN_PATH} (for local dev only)`);

      if (!tokens.refresh_token) {
        console.log('\n⚠️  No refresh_token was returned. This usually means you\'ve already');
        console.log('   authorized this app before. Go to https://myaccount.google.com/permissions,');
        console.log('   remove access for this app, then run this script again.\n');
        process.exit(1);
      }

      console.log('\n================ COPY THIS INTO RENDER ================');
      console.log('Render → your service → Environment → add these variables:\n');
      console.log(`GOOGLE_OAUTH_CLIENT_ID=${process.env.GOOGLE_OAUTH_CLIENT_ID}`);
      console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${process.env.GOOGLE_OAUTH_CLIENT_SECRET}`);
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('=========================================================\n');
      console.log('⚠️  Treat the refresh token like a password — never commit it.');
      process.exit(0);
    } catch (err) {
      logger.error('❌ Failed to exchange authorization code for tokens:', err.message);
      server.close();
      process.exit(1);
    }
  })
  .listen(PORT);