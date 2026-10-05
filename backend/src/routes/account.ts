import express from 'express';
import * as accountController from '../controllers/account.ts';

const router = express.Router();

router.get('/export', accountController.downloadData);

export default router;
