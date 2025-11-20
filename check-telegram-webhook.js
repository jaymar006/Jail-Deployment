// Temporary script to check and clear Telegram webhook
// Run this with: node check-telegram-webhook.js
require('dotenv').config();

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  console.error('💡 Make sure you have a .env file in the backend folder with TELEGRAM_BOT_TOKEN set');
  process.exit(1);
}

// Check webhook info
const checkWebhook = () => {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
};

// Delete webhook
const deleteWebhook = () => {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
};

(async () => {
  try {
    console.log('🔍 Checking Telegram webhook status...\n');
    
    const webhookInfo = await checkWebhook();
    
    if (webhookInfo.ok) {
      console.log('📊 Webhook Info:');
      console.log(JSON.stringify(webhookInfo.result, null, 2));
      
      if (webhookInfo.result.url) {
        console.log('\n⚠️  FOUND WEBHOOK:', webhookInfo.result.url);
        console.log('This is causing the 409 conflict with polling!\n');
        
        console.log('🗑️  Deleting webhook...');
        const deleteResult = await deleteWebhook();
        
        if (deleteResult.ok) {
          console.log('✅ Webhook deleted successfully!');
          console.log('Now you can enable polling without conflicts.');
        } else {
          console.log('❌ Failed to delete webhook:', deleteResult);
        }
      } else {
        console.log('\n✅ No webhook set - polling should work fine!');
        console.log('The 409 conflict must be from another source.');
      }
    } else {
      console.log('❌ Error:', webhookInfo);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

