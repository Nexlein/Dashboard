// First import: loads .env and validates the environment (exits on error).
import env from './utils/env.ts';
import path from 'node:path';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth.ts';
import accountRoutes from './routes/account.ts';
import aboutRoutes from './routes/about.ts';
import widgetRoutes from './routes/widgets.ts';
import serviceRoutes from './routes/services.ts';
import healthRoutes from './routes/health.ts';
import chatbotRoutes from './routes/chatbot.ts';

import authMiddleware from './middleware/auth.ts';
import errorHandler from './middleware/errorHandler.ts';
import { createRateLimiter } from './utils/rateLimit.ts';
import { allowedOrigins } from './utils/origins.ts';

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());

app.use(
    createRateLimiter({
        name: 'global',
        windowMs: 15 * 60 * 1000,
        limit: env.GLOBAL_RATE_LIMIT_MAX,
        message: 'Too many requests from this IP, please try again later.',
    }),
);

app.use(
    cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    }),
);

// Better Auth reads the raw request body itself: mount it before express.json().
app.use(
    ['/api/auth/sign-in', '/api/auth/sign-up'],
    createRateLimiter({
        name: 'auth',
        windowMs: 15 * 60 * 1000,
        limit: env.AUTH_RATE_LIMIT_MAX,
        message: 'Too many authentication attempts. Please try again later.',
    }),
);
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Dashboard API',
            version: '1.0.0',
            description: 'API documentation for the Dashboard project',
        },
        servers: [{ url: 'http://localhost:8080' }],
        components: {
            securitySchemes: {
                // Better Auth's session cookie, set by POST /api/auth/sign-in/email.
                cookieAuth: { type: 'apiKey', in: 'cookie', name: 'dashboard.session_token' },
            },
        },
        security: [{ cookieAuth: [] }],
    },
    // All OpenAPI annotations live in swagger-docs (.ts in src/, .js once compiled to dist/).
    apis: [path.join(import.meta.dirname, 'swagger-docs.*')],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/account', authMiddleware, accountRoutes);
app.use('/about.json', aboutRoutes);
app.use('/widgets', authMiddleware, widgetRoutes);
app.use('/services', authMiddleware, serviceRoutes);
app.use('/chatbot', authMiddleware, chatbotRoutes);
app.use('/health', healthRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;
