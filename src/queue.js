// src/queue.js
const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const orderQueueName = 'orders';
const orderQueue = new Queue(orderQueueName, { connection });
new QueueScheduler(orderQueueName, { connection }); // handles delayed/retries

module.exports = { orderQueue, connection };
