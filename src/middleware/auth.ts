import { Request, Response, NextFunction } from 'express';
import { loadEnvConfig } from '../utils/env';

const config = loadEnvConfig();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // For plain bearer token authentication, we just check if the token matches the expected token
  if (token !== config.jwtSecret) {
    return res.status(403).json({ message: 'Invalid token' });
  }
  
  // For plain bearer token, we can set a default user or extract user info from the token if needed
  // Here we'll set a default system user
  req.user = {
    id: 'system-user',
    email: 'system@example.com'
  };
  
  next();
};
