import express from 'express';
const router = express.Router();
import * as healthController from '../controllers/health.js';

router.get('/', healthController.checkHealth);

export default router;
