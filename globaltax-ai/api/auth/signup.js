import { Redis } from '@upstash/redis';
import { hashPassword } from './_crypto.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  if (!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)) {
    return res.status(500).json({ error: 'Database not configured. Please set up Upstash Redis in your Vercel Dashboard.' });
  }

  const redis = Redis.fromEnv();

  const { name, email, pwd, role } = req.body;
  if (!email || !pwd || !name) return res.status(400).json({ error: 'Missing fields' });
  
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const existing = await redis.hget('users', normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(pwd);
    
    const user = {
      id: "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };

    await redis.hset('users', { [normalizedEmail]: user });
    
    delete user.passwordHash;
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
