import express from 'express';
import * as accountController from '../controllers/account.ts';

const router = express.Router();

router.get('/export', accountController.downloadData);
router.put('/profile', accountController.updateProfile);

export default router;
