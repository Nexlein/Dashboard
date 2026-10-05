const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot');

router.get('/models', chatbotController.getModels);
router.post('/pull', chatbotController.pullModel);

module.exports = router;
