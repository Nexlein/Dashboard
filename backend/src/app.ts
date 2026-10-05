// First import: loads .env and validates the environment (exits on error).
import env from './utils/env.ts';
import path from 'node:path';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import adminRoutes from './routes/admin.ts';
import authRoutes from './routes/auth.ts';
import aboutRoutes from './routes/about.ts';
import widgetRoutes from './routes/widgets.ts';
import serviceRoutes from './routes/services.ts';
import healthRoutes from './routes/health.ts';
import chatbotRoutes from './routes/chatbot.ts';

import authMiddleware from './middleware/auth.ts';
import adminMiddleware from './middleware/admin.ts';
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
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

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
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                cookieAuth: { type: 'apiKey', in: 'cookie', name: 'dashboard_session' },
            },
        },
        // Either scheme authenticates: the session cookie (browsers) or a Bearer token.
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    },
    // All OpenAPI annotations live in swagger-docs (.ts in src/, .js once compiled to dist/).
    apis: [path.join(import.meta.dirname, 'swagger-docs.*')],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/auth', authRoutes);
app.use('/about.json', aboutRoutes);
app.use('/widgets', authMiddleware, widgetRoutes);
app.use('/services', authMiddleware, serviceRoutes);
app.use('/chatbot', authMiddleware, chatbotRoutes);
app.use('/health', healthRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;
