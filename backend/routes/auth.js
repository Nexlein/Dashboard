import express from 'express';
import requireAuth from '../middleware/auth.js';
import * as authController from '../controllers/auth.js';
import * as githubAuthController from '../controllers/githubAuth.js';
import * as accountController from '../controllers/account.js';
import env from '../utils/env.js';
import { createRateLimiter } from '../utils/rateLimit.js';

const router = express.Router();

const credentialsLimiter = createRateLimiter({
    name: 'auth',
    windowMs: 15 * 60 * 1000,
    limit: env.AUTH_RATE_LIMIT_MAX,
    message: 'Too many authentication attempts. Please try again later.',
});

router.use('/github', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    next();
});

router.use(['/register', '/login'], credentialsLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.getMe);
router.put('/me', requireAuth, authController.updateMe);

router.get('/github', requireAuth, githubAuthController.githubLink);
router.get('/github/callback', githubAuthController.githubCallback);
router.get('/github/login', githubAuthController.githubLogin);

router.get('/download-data', requireAuth, accountController.downloadData);
router.delete('/delete-account', requireAuth, accountController.deleteAccount);

export default router;
