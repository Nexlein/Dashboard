require('dotenv').config({
    path: require('node:path').join(__dirname, '.env'),
});
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const aboutRoutes = require('./routes/about');
const widgetRoutes = require('./routes/widgets');
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/auth', authRoutes);
app.use('/about.json', aboutRoutes);
app.use('/widgets', authMiddleware, widgetRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
