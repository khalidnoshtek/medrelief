import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './config/database';
import { registerAllEventHandlers } from './shared/events/event-handlers';

async function main() {
  // Register domain event handlers
  registerAllEventHandlers();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Medrelief backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  prisma.$disconnect();
  process.exit(1);
});
