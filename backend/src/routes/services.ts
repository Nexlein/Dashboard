import express from 'express';
const router = express.Router();
import * as servicesController from '../controllers/services.ts';

router.get('/', servicesController.getServices);
router.get('/:serviceName/search', servicesController.searchService);
router.put('/:serviceName/connection', servicesController.connectService);
router.delete('/:serviceName/connection', servicesController.disconnectService);
router.delete('/:serviceName/accounts/:accountId', servicesController.disconnectAccount);

export default router;
