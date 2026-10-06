import express from 'express';
import registry from '../services/registry.ts';

const router = express.Router();

// Exactly the schema of the Epitech subject: the registry entries also carry connection
// settings and functions, which are not part of it.
router.get('/', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress;

    res.json({
        client: { host: clientIp },
        server: {
            current_time: Math.floor(Date.now() / 1000),
            services: registry.getAllServices().map((service) => ({
                name: service.name,
                widgets: service.widgets.map((widget) => ({
                    name: widget.name,
                    description: widget.description,
                    params: widget.params.map((param) => ({
                        name: param.name,
                        type: param.type,
                    })),
                })),
            })),
        },
    });
});

export default router;
