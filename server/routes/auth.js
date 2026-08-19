import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Name, email and a password of at least 6 characters are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with that email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, phone: phone?.trim(), passwordHash, role: 'user' });
    const safe = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role };
    res.status(201).json({ token: tokenFor(user), user: safe });
  } catch (err) {
    res.status(500).json({ message: 'Could not create account.', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
    res.json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.' });
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
