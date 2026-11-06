const express = require('express');
const router = express.Router();
const { getAuditLogs, logAdminActionRoute } = require('../controllers/auditController');

// GET logs filtered by a specific device
router.get('/:deviceId/logs', getAuditLogs);

// POST route to record manual audit events: POST /api/audit/action
router.post('/action', logAdminActionRoute);

module.exports = router;