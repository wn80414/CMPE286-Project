const supabase = require('../config/supabase');

// Fetch logs with optional filters for device_id or log_type
const getAuditLogs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { type, limit = 50 } = req.query;

    let query = supabase
      .from('device_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    // Strict device_id filter
    if (deviceId && deviceId !== 'global') {
      query = query.eq('device_id', deviceId);
    }

    if (type) {
      query = query.eq('event_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DATABASE] Error fetching audit logs:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Map database columns to match frontend AccessLogs expectations
    const formattedData = (data || []).map((log) => ({
      ...log,
      log_type: log.event_type || 'ADMIN_ACTION',
      actor_or_card: log.actor
    }));

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error('[API] Unexpected error in getAuditLogs:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Insert a manual admin audit record when a control button is pressed
const recordAdminAction = async (deviceId, action, actor = 'ADMIN_DASHBOARD', metadata = {}) => {
  try {
    const { data, error } = await supabase.from('device_audit_logs').insert([{
      device_id: deviceId,
      event_type: 'ADMIN_ACTION',
      action: action,
      actor: actor,
      metadata: metadata
    }]);

    if (error) {
      console.error('[DATABASE] Supabase Audit Insert Error:', error.message, error.details, error.hint);
      throw new Error(error.message);
    }

    console.log('[DATABASE] Audit log recorded successfully for device:', deviceId);
    return data;
  } catch (err) {
    console.error('[DATABASE] Failed to record admin audit log:', err.message);
    throw err; // Propagate up so the API route catches it if needed
  }
};

const logAdminActionRoute = async (req, res) => {
  try {
    const { device_id, action, actor, metadata } = req.body;
    
    await recordAdminAction(
      device_id || null, 
      action, 
      actor || 'admin@system.com', 
      metadata || {}
    );

    return res.status(201).json({ success: true, message: 'Audit action recorded' });
  } catch (err) {
    console.error('[API] Error in logAdminActionRoute:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAuditLogs,
  recordAdminAction,
  logAdminActionRoute
};
