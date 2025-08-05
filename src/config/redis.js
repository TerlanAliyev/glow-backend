// src/config/redis.js
const Redis = require('ioredis');

// Bu, Redis serverimizə qoşulmaq üçün istifadə edəcəyimiz obyektdir.
const redis = new Redis({
    port: 6379, // Standart Redis portu
    host: '127.0.0.1', // Lokal kompüter
});

redis.on('connect', () => {
    console.log('Redis client uğurla qoşuldu.');
});

redis.on('error', (err) => {
    console.error('Redis qoşulma xətası:', err);
});

module.exports = redis;