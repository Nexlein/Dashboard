import express from 'express';
const router = express.Router();
import * as servicesController from '../controllers/services.js';

router.get('/', servicesController.getServices);
router.put('/:serviceName/connection', servicesController.connectService);
router.delete('/:serviceName/connection', servicesController.disconnectService);

export default router;
