import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import type { UserPayload } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'superrefreshsecret_change_in_production';

export const generateAccessToken = (payload: UserPayload) => {
  console.log("cirando novo token")
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: UserPayload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

export const verifyAccessToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
};

export const verifyRefreshToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as UserPayload;
};
