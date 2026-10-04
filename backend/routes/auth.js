const express = require('express');
const requireAuth = require('../middleware/auth');
const cookieParser = require('cookie-parser');
const authController = require('../controllers/auth');
const githubAuthController = require('../controllers/githubAuth');
const accountController = require('../controllers/account');
const env = require('../utils/env');
const { createRateLimiter } = require('../utils/rateLimit');

const router = express.Router();

const credentialsLimiter = createRateLimiter({
    name: 'auth',
    windowMs: 15 * 60 * 1000,
    limit: env.AUTH_RATE_LIMIT_MAX,
    message: 'Too many authentication attempts. Please try again later.',
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

router.get('/github', requireAuth, githubAuthController.githubLink);
router.get('/github/callback', githubAuthController.githubCallback);
router.get('/github/login', githubAuthController.githubLogin);

router.get('/download-data', requireAuth, accountController.downloadData);
router.delete('/delete-account', requireAuth, accountController.deleteAccount);

module.exports = router;
