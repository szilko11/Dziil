import jwt from 'jsonwebtoken';

export const DISCORD_CONFIG = {
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1160471444195651585',
  CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || 'j_KFkcn1Yw2WwwYG9EYU3h6vogRjumL4',
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN || 'MTE2MDQ3MTQ0NDE5NTY1MTU4NQ.GGDK-7.8wnW0PcI96_Z17afDJjhVdjl6h4AMlmW8juJBY'
};

export const JWT_SECRET = process.env.JWT_SECRET || 'nexus-jwt-hardware-secret-stable-2024';

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
      req.user = null;
      return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
        req.user = null;
        return next();
    }
    req.user = user;
    next();
  });
};
