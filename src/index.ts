// index.ts
import 'dotenv/config'; // Loads environment variables from .env file
import express from 'express';
import { bot, startLongPolling, startWebhook } from './core/telegram'

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g., 'https://your-domain.com/botwebhook'

// Ensure essential environment variables are set
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('Environment variable TELEGRAM_BOT_TOKEN is not set.');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY) are not set.');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error('Environment variable OPENROUTER_API_KEY is not set.');
  process.exit(1);
}


const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Pet Butler AI is running!');
});

// Determine deployment mode (long polling vs. webhook)
if (process.env.NODE_ENV === 'production' && WEBHOOK_URL) {
  // Use webhook in production
  const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
  app.use(webhookPath, bot.webhookCallback(webhookPath));
  startWebhook(WEBHOOK_URL + webhookPath); // Pass the full webhook URL to Telegram
  console.log(`Bot configured for webhook at ${WEBHOOK_URL + webhookPath}`);
} else {
  // Use long polling for local development or if webhook URL is not provided
  startLongPolling();
  console.log('Bot configured for long polling.');
}

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// For Vercel, you might export the app for serverless function handling:
// module.exports = app;