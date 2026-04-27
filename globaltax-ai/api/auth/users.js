import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)) {
    return res.status(200).json([]); // Return empty if not configured
  }

  const redis = Redis.fromEnv();

  try {
    const usersMap = await redis.hgetall('users');
    if (!usersMap) return res.status(200).json([]);
    
    const users = Object.values(usersMap).map(u => {
      delete u.passwordHash;
      return u;
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
