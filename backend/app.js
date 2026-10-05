require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const env = require('./utils/env'); // Validates environment variables at boot (exits on error)

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const aboutRoutes = require('./routes/about');
const widgetRoutes = require('./routes/widgets');
const serviceRoutes = require('./routes/services');
const healthRoutes = require('./routes/health');
const chatbotRoutes = require('./routes/chatbot');

const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');
const errorHandler = require('./middleware/errorHandler');
const { createRateLimiter } = require('./utils/rateLimit');
const { allowedOrigins } = require('./utils/origins');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

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
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./routes/*.js', './swagger-docs.js'],
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

module.exports = app;
