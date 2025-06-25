import type { NextFunction, Request, Response } from "express";
import { checkOtpRestrictions, sendOtp, trackOtpRestrictions, validateRegistrationData } from "../utils/auth-helper";
import prisma from "@packages/libs/prisma";
import { ValidationError } from "@packages/middlewares/error-handler";

export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateRegistrationData(req.body, 'user');
  const { name, email } = req.body;

  const existingUser = await prisma.users.findUnique({
    where: {
      email
    }
  });

  if (existingUser) {
    return next(new ValidationError('User already exists with this email!'));
  }

  await checkOtpRestrictions(email, next);
  await trackOtpRestrictions(email, next);
  await sendOtp(name, email, "user-activation-mail");

  res.status(200).json({
    message: 'OTP sent to email. Please verify your account.'
  })
  } catch (error) {
    return next(error);
  }
}