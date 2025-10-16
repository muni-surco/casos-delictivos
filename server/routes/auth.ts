import express from "express";
import express from "express";
import { supabase } from "../lib/supabase";

const router = express.Router();

// POST /api/auth/confirm { email }
router.post("/auth/confirm", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    // list users and find by email
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) return res.status(500).json({ error: listErr.message });

    const user = (users?.users || []).find((u: any) => u.email === email);
    if (!user) return res.status(404).json({ error: "user not found" });

    // update user to mark email_confirmed
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      // set this field to avoid requiring confirmation
      email_confirm: true,
    } as any);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ success: true, user: data });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// POST /api/auth/create { username, password }
router.post("/auth/create", async (req, res) => {
  const { username, password, email } = req.body as { username?: string; password?: string; email?: string };
  if (!username || !password || !email) return res.status(400).json({ error: "username, email and password required" });

  const userEmail = email || `${username}@local.invalid`;

  try {
    // create user via admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: userEmail,
      password,
      user_metadata: { username },
      // mark as confirmed
      email_confirm: true,
    } as any);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, user: data });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

export default router;
