const express = require('express');
const requireAuth = require('../middleware/auth');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const authController = require('../controllers/auth');

const router = express.Router();

const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const { redisClient } = require('../utils/redisCache');

const credentialsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(process.env.NODE_ENV !== 'test' && redisClient
        ? { store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }) }
        : {}),
    message: { error: 'Too many authentication attempts. Please try again later.' },
});

router.use('/github', cookieParser(), (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    next();
});

router.use(['/register', '/login'], credentialsLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', requireAuth, authController.getMe);
router.put('/me', requireAuth, authController.updateMe);

router.get('/github', requireAuth, authController.githubLink);
router.get('/github/callback', authController.githubCallback);
router.get('/github/login', authController.githubLogin);

router.get('/download-data', requireAuth, authController.downloadData);
router.delete('/delete-account', requireAuth, authController.deleteAccount);

module.exports = router;
