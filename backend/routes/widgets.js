const express = require('express');
const router = express.Router();
const widgetsController = require('../controllers/widgets');

router.get('/', widgetsController.getWidgets);
router.post('/', widgetsController.addWidget);
router.put('/layout', widgetsController.updateLayout);
router.get('/:id/data', widgetsController.getWidgetData);
router.put('/:id', widgetsController.updateWidget);
router.delete('/:id', widgetsController.deleteWidget);
router.post('/:id/chat', widgetsController.chatWidget);

module.exports = router;
