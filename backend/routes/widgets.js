import express from 'express';
const router = express.Router();
import * as widgetsController from '../controllers/widgets.js';

router.get('/', widgetsController.getWidgets);
router.post('/', widgetsController.addWidget);
router.put('/layout', widgetsController.updateLayout);
router.get('/:id/data', widgetsController.getWidgetData);
router.put('/:id', widgetsController.updateWidget);
router.delete('/:id', widgetsController.deleteWidget);
router.post('/:id/chat', widgetsController.chatWidget);

export default router;
