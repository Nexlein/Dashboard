const express = require('express');
const registry = require('../services/registry');

const router = express.Router();

router.get('/', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress;

    res.json({
        client: { host: clientIp },
        server: {
            current_time: Math.floor(Date.now() / 1000),
            services: registry.getAllServices(),
        },
    });
});

module.exports = router;
