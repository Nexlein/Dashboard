import express from 'express';
const router = express.Router();
import * as adminController from '../controllers/admin.ts';

router.get('/users', adminController.getUsers);
router.delete('/users/:id', adminController.deleteUser);

export default router;
