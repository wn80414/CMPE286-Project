const express = require('express');
const router = express.Router();
const { 
  getDevices, 
  getDeviceLogs, 
  controlDeviceLock, 
  deleteDevice,
  getDeviceRoles,
  updateDeviceRoles
} = require('../controllers/deviceController');

router.get('/', getDevices);
router.get('/:id/logs', getDeviceLogs);
router.post('/:id/control', controlDeviceLock);
router.delete('/:id', deleteDevice);
router.get('/:id/roles', getDeviceRoles);
router.put('/:id/roles', updateDeviceRoles);

module.exports = router;