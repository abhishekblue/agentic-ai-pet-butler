// telegram.ts
import { Telegraf } from 'telegraf';
import { processMessage } from './coreLogic';

// Load environment variables if not already loaded globally (e.g., in index.ts)
// import 'dotenv/config'; 

const botToken = process.env.TELEGRAM_BOT_TOKEN as string;

if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}

// Initialize Telegraf bot
const bot = new Telegraf(botToken);

// Middleware to log incoming messages (optional, for debugging)
bot.use(async (ctx, next) => {
  console.log('Incoming Telegram message from chat ID:', ctx.chat?.id, 'Text:', (ctx.message as any)?.text);
  await next();
});

// Handle all incoming text messages
bot.hears(/.*/, async (ctx) => { // .*/ matches any text message
  const chatId = ctx.chat.id.toString();
  const messageText = ctx.message.text;

  try {
    const replyText = await processMessage(chatId, messageText);
    await ctx.reply(replyText);
  } catch (error) {
    console.error('Error processing Telegram message:', error);
    await ctx.reply('I apologize, but I encountered an error trying to process your request. Could you please try again?');
  }
});

// Set up webhook (for Vercel/EC2 deployment)
export const startWebhook = async (webhookUrl: string) => {
  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Telegram webhook set to: ${webhookUrl}`);
  } catch (e) {
    console.error('Error setting Telegram webhook:', e);
  }
};

// Start long polling (for local development or EC2 without webhooks)
export const startLongPolling = async () => {
  try {
    await bot.launch();
    console.log('Telegram bot started via long polling');
  } catch (e) {
    console.error('Error starting Telegram bot via long polling:', e);
  }

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

// Export the bot instance for webhook handling in index.ts if needed
export { bot };