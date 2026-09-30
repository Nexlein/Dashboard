require('dotenv').config({
    path: require('node:path').join(__dirname, '.env'),
});
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const aboutRoutes = require('./routes/about');
const widgetRoutes = require('./routes/widgets');
const serviceRoutes = require('./routes/services');
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Docker) for accurate IP rate limiting
const PORT = process.env.PORT || 8080;
const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:8081'
)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
);
app.use(express.json());

const healthRoutes = require('./routes/health');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Dashboard API',
            version: '1.0.0',
            description: 'API documentation for the Dashboard project',
        },
        servers: [
            {
                url: 'http://localhost:8080',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./routes/*.js', './swagger-docs.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/auth', authRoutes);
app.use('/about.json', aboutRoutes);
app.use('/widgets', authMiddleware, widgetRoutes);
app.use('/services', authMiddleware, serviceRoutes);
const chatbotRoutes = require('./routes/chatbot');
app.use('/chatbot', authMiddleware, chatbotRoutes);
app.use('/health', healthRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

if (require.main === module) {
    const { PrismaClient } = require('@prisma/client');
    const { migrateOAuthTokens } = require('./utils/migrateOAuthTokens');
    const migrationClient = new PrismaClient();
    migrateOAuthTokens(migrationClient)
        .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
        .catch((err) => {
            console.error(
                'OAuth token migration failed; server not started. Check database and encryption key.',
                err,
            );
            process.exit(1);
        })
        .finally(() => migrationClient.$disconnect());
}

module.exports = app;
