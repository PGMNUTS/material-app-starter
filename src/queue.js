// src/queue.js
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Shared Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // BullMQ requires this to allow blocking commands
  maxRetriesPerRequest: null,
  // Avoid ready-check delays on managed Redis
  enableReadyCheck: false,
});

const orderQueueName = 'orders';
const orderQueue = new Queue(orderQueueName, { connection });

module.exports = { orderQueue, connection, orderQueueName };
