// src/config/redis.js
const Redis = require('ioredis');

// Bu, Redis serverimizə qoşulmaq üçün istifadə edəcəyimiz obyektdir.
const redis = new Redis({
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1',
});

redis.on('connect', () => {
    console.log('Redis client uğurla qoşuldu.');
});

redis.on('error', (err) => {
    console.error('Redis qoşulma xətası:', err);
});

module.exports = redis;