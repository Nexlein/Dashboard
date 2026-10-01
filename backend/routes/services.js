const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services');

router.get('/', servicesController.getServices);
router.put('/:serviceName/connection', servicesController.connectService);
router.delete('/:serviceName/connection', servicesController.disconnectService);

module.exports = router;
