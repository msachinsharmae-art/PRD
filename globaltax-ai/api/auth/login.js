import { Redis } from '@upstash/redis';
import { verifyPassword } from './_crypto.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)) {
    return res.status(500).json({ error: 'Database not configured. Please set up Upstash Redis in your Vercel Dashboard.' });
  }

  const redis = Redis.fromEnv();

  const { email, pwd } = req.body;
  if (!email || !pwd) return res.status(400).json({ error: 'Missing fields' });
  
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const user = await redis.hget('users', normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const isOk = await verifyPassword(pwd, user.passwordHash);
    if (!isOk) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    
    delete user.passwordHash;
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
