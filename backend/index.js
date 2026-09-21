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
    }),
);
app.use(express.json());

app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/auth', authRoutes);
app.use('/about.json', aboutRoutes);
app.use('/widgets', authMiddleware, widgetRoutes);
app.use('/services', authMiddleware, serviceRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
