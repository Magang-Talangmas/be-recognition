import jwt from 'jsonwebtoken';
import { env } from './src/config/env';

const token = jwt.sign(
  {
    sub: 'dummy-admin-id',
    email: 'admin@example.com',
    role: 'ADMIN'
  },
  env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log(token);
