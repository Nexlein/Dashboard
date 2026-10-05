import express from 'express';
const router = express.Router();
import * as chatbotController from '../controllers/chatbot.ts';

router.get('/models', chatbotController.getModels);
router.post('/pull', chatbotController.pullModel);

export default router;
