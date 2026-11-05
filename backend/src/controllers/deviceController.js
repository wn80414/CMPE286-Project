const supabase = require("../config/supabase");
const mqttClient = require("../config/mqttClient");

// Get all registered devices
const getDevices = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("name");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get logs for a specific device, formatted with user details
const getDeviceLogs = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const [logsRes, usersRes] = await Promise.all([
      supabase
        .from("device_logs")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false }),
      supabase.from("users").select("card_uid, first_name, last_name, title"),
    ]);

    if (logsRes.error)
      return res.status(500).json({ error: logsRes.error.message });

    const userMap = new Map();
    if (usersRes.data) {
      usersRes.data.forEach((u) => {
        const nameParts = [u.first_name, u.last_name].filter(Boolean);
        let nameStr = nameParts.join(" ");
        if (u.title) nameStr += ` (${u.title})`;
        userMap.set(u.card_uid, nameStr);
      });
    }

    const formattedLogs = (logsRes.data || []).map((log) => ({
      ...log,
      user_name: userMap.get(log.card_uid) || "Unknown / Unregistered User",
    }));

    res.json(formattedLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trigger physical lock/unlock action via MQTT and update DB
const controlDeviceLock = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { action } = req.body; // 'TEMP_OPEN', 'LOCKED', or 'UNLOCKED'

    // 1. Allow 'TEMP_OPEN' along with 'LOCKED' and 'UNLOCKED'
    const validActions = ["TEMP_OPEN", "LOCKED", "UNLOCKED"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: "Invalid action payload" });
    }

    const controlTopic = `${deviceId}/set`;
    console.log(`[MQTT] Publishing "${action}" to topic: "${controlTopic}"`);

    // 2. Publish command to MQTT broker
    mqttClient.publish(controlTopic, action, { qos: 1 }, (err) => {
      if (err) {
        console.error(
          `[MQTT Error] Failed to publish to ${controlTopic}:`,
          err,
        );
      } else {
        console.log(`[MQTT Success] Delivered ${action} to ${controlTopic}`);
      }
    });

    // 3. Prepare database update
    const updateData = { updated_at: new Date().toISOString() };

    // Only update the persistent lock_state column if it's a permanent lock/unlock command.
    // 'TEMP_OPEN' is a transient pulse, so we leave the persistent state as is.
    if (action === "LOCKED" || action === "UNLOCKED") {
      updateData.lock_state = action;
    }

    const { error } = await supabase
      .from("devices")
      .update(updateData)
      .eq("id", deviceId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, lock_state: action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a device by ID
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("id", deviceId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: "Device deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all available roles and mark which ones are enabled for this device
const getDeviceRoles = async (req, res) => {
  try {
    const deviceId = req.params.id;

    // Fetch all roles and allowed mappings in parallel
    const [rolesRes, allowedRes] = await Promise.all([
      supabase.from("roles").select("*").order("name"),
      supabase
        .from("device_allowed_roles")
        .select("role_id")
        .eq("device_id", deviceId),
    ]);

    if (rolesRes.error)
      return res.status(500).json({ error: rolesRes.error.message });

    const allowedRoleIds = new Set(
      (allowedRes.data || []).map((r) => r.role_id),
    );

    // Map over roles to inject the boolean flag matching your UI checklist/checkboxes
    const rolesWithStatus = (rolesRes.data || []).map((role) => ({
      ...role,
      is_allowed: allowedRoleIds.has(role.id),
    }));

    res.json(rolesWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update/sync allowed roles for a device
const updateDeviceRoles = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { roleIds } = req.body; // Array of role UUID strings

    if (!Array.isArray(roleIds)) {
      return res
        .status(400)
        .json({ error: "roleIds must be an array of UUID strings" });
    }

    // 1. Clear existing role permissions for this device
    const { error: deleteError } = await supabase
      .from("device_allowed_roles")
      .delete()
      .eq("device_id", deviceId);

    if (deleteError)
      return res.status(500).json({ error: deleteError.message });

    // 2. Insert new role permissions if any are selected
    if (roleIds.length > 0) {
      const insertPayload = roleIds.map((roleId) => ({
        device_id: deviceId,
        role_id: roleId, // Matches uuid type in public.roles
      }));

      const { error: insertError } = await supabase
        .from("device_allowed_roles")
        .insert(insertPayload);

      if (insertError)
        return res.status(500).json({ error: insertError.message });
    }

    res.json({ success: true, message: "Device roles updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDevices,
  getDeviceLogs,
  controlDeviceLock,
  deleteDevice,
  getDeviceRoles,
  updateDeviceRoles,
};
