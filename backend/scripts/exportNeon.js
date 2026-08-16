const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendEnvPath = path.join(__dirname, '..', '.env');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const args = process.argv.slice(2);
const localOnly = args.includes('--local-only');

if (!neonUrl) {
  console.error('❌ Error: NEON_DATABASE_URL or DATABASE_URL environment variable is not defined.');
  console.error('   Set it in .env or the root .env file.');
  process.exit(1);
}

process.env.DATABASE_URL = neonUrl;
process.env.NODE_ENV = 'production';

const backupService = require('../services/backupService');

async function main() {
  console.log(`🔌 Exporting Neon database (${new URL(neonUrl).hostname})...`);

  const { filePath, fileName, type } = await backupService.backupDatabase(['account_lockouts']);
  console.log(`✅ Local export saved: ${filePath}`);

  if (localOnly) {
    console.log('🧪 Local-only mode. Skipping Google Drive upload.');
    process.exit(0);
  }

  const driveRes = await backupService.uploadToGoogleDrive(filePath, fileName);
  console.log(`✅ Uploaded to Google Drive. File ID: ${driveRes.id}`);
  if (driveRes.webViewLink) {
    console.log(`🔗 Link: ${driveRes.webViewLink}`);
  }

  console.log('\n🎉 Export complete!');
  console.log(`   Local file: ${filePath}`);
  console.log(`   Google Drive File ID: ${driveRes.id}`);
}

main().catch((err) => {
  console.error('\n❌ Export failed:', err.message);
  process.exit(1);
});
