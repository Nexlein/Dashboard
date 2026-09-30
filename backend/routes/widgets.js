const express = require('express');
const widgetService = require('../services/widgetService');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const widgets = await widgetService.getUserWidgets(req.user.userId);
        res.json(widgets);
    }),
);

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const { serviceName, widgetName, params, refreshRate, layout } = req.body;
        if (!serviceName || !widgetName || !params || !refreshRate || !layout) {
            return res.status(400).json({ error: 'Missing required widget fields' });
        }

        const widget = await widgetService.createWidget(req.user.userId, {
            serviceName,
            widgetName,
            params,
            refreshRate,
            layout,
        });
        res.status(201).json(widget);
    }),
);

router.put(
    '/layout',
    asyncHandler(async (req, res) => {
        await widgetService.updateWidgetLayouts(req.user.userId, req.body.layouts);
        res.status(204).send();
    }),
);

router.get(
    '/:id/data',
    asyncHandler(async (req, res) => {
        const widgetId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(widgetId) || widgetId <= 0) {
            return res.status(400).json({ error: 'Invalid widget id' });
        }

        const data = await widgetService.getWidgetData(req.user.userId, widgetId);
        res.json(data);
    }),
);

router.put(
    '/:id',
    asyncHandler(async (req, res) => {
        const widgetId = parseInt(req.params.id, 10);
        const widget = await widgetService.updateWidget(req.user.userId, widgetId, req.body);
        res.json(widget);
    }),
);

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const widgetId = parseInt(req.params.id, 10);
        await widgetService.deleteWidget(req.user.userId, widgetId);
        res.status(204).send();
    }),
);

router.post(
    '/:id/chat',
    asyncHandler(async (req, res) => {
        const widgetId = parseInt(req.params.id, 10);
        const data = await widgetService.chatWidget(req.user.userId, widgetId, req.body.messages);
        res.json(data);
    }),
);

module.exports = router;
