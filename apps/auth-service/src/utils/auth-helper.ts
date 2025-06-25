import crypto from 'node:crypto';
import { ValidationError } from '@packages/middlewares/error-handler';
import type { NextFunction } from 'express';
import redis from '@packages/libs/redis';
import { sendEmail } from './sendEmail';

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

export const checkOtpRestrictions = async (email: string, next: NextFunction) => {
  if (await redis.get(`otp_lock:${email}`)) {
    return next(new ValidationError('You have reached the maximum number of attempts! Please try again after 30 minutes.'));
  }

  if (await redis.get(`otp_spam_lock:${email}`)) {
    return next(new ValidationError('You have reached the maximum number of attempts! Please try again after 1 hour.'));
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    return next(new ValidationError('Please wait 1 minute before requesting a new OTP.'));
  }
}

export const trackOtpRestrictions = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`;

  let otpRequests = parseInt((await redis.get(otpRequestKey)) || '0');

  if (otpRequests >= 2) {
    await redis.set(`otp_spam_lock:${email}`, "true", "EX", 3600); // lock for 1 hour
    return next(new ValidationError('You have reached the maximum number of attempts! Please try again after 1 hour.'));
  }
  
  await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600); // track for 1 hour
}

export const sendOtp = async (name: string, email: string, template: string) => {
  const otp = crypto.randomInt(1000, 9999).toString();

  await sendEmail(email, "Verify your email", template, { name, otp });
  await redis.set(`otp:${email}`, otp, "EX", 300);
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);
}