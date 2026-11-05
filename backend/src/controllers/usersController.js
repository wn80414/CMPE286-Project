const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, title, card_uid, role_id, is_active } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ first_name, last_name, title, card_uid, role_id, is_active })
      .eq('id', userId)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, user: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};