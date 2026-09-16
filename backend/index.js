const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const aboutRoutes = require('./routes/about');
const widgetRoutes = require('./routes/widgets');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/about.json', aboutRoutes);
app.use('/widgets', authMiddleware, widgetRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
