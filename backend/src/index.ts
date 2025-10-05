import dotenv from 'dotenv';
import prisma from './lib/prisma';
import { createApp } from './app';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`My-Desk API listening on port ${PORT}`);
});

async function gracefulShutdown(signal: NodeJS.Signals) {
  console.log(`\nReceived ${signal}. Closing server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
