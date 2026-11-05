const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase'); // Adjust path to your supabase client if needed

// ==================== USERS CRUD ====================

// GET /api/users - Fetch all users
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, title, card_uid, role_id, is_active')
      .order('first_name', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Provision a new user
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, title, card_uid, role_id } = req.body;

    const { data, error } = await supabase
      .from('users')
      .insert([{
        first_name,
        last_name,
        title,
        card_uid: card_uid ? card_uid.toUpperCase() : null,
        role_id: role_id || null,
        is_active: true
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ success: true, user: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Update user details, role, or active status
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, title, card_uid, role_id, is_active } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ 
        first_name, 
        last_name, 
        title, 
        card_uid, 
        role_id, 
        is_active,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete a user completely
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== ROLES SUB-ROUTE ====================

// GET /api/users/roles - Fetch all available permission roles for dropdowns
router.get('/roles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;