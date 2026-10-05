import express from 'express';
const router = express.Router();
import * as chatbotController from '../controllers/chatbot.js';

router.get('/models', chatbotController.getModels);
router.post('/pull', chatbotController.pullModel);

export default router;
