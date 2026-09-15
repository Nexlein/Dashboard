const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/about.json', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress;

    res.json({
        client: { host: clientIp },
        server: {
            current_time: Math.floor(Date.now() / 1000),
            services: [], // Will populate later with real services
        },
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
