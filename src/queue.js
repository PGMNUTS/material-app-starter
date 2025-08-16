// src/queue.js
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const orderQueueName = 'orders';
const orderQueue = new Queue(orderQueueName, { connection });

module.exports = { orderQueue, connection, orderQueueName };
