import crypto from 'node:crypto';
import { ValidationError } from '../../../../packages/middlewares/error-handler';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const validateRegistrationData = (data: any, userType: 'user' | 'seller') => {
  const { name, email, password, phone_number, country } = data;

  if (!name || !email || !password || (userType === 'seller' && (!phone_number || !country))) {
    throw new ValidationError('Missing required fields!');
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format!');
  }
}