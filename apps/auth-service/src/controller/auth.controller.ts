import type { NextFunction, Request, Response } from "express";
import { checkOtpRestrictions, handleForgotPassword, sendOtp, trackOtpRequests, validateRegistrationData, verifyForgotPasswordOtp, verifyOtp } from "../utils/auth-helper";
import prisma from "@packages/libs/prisma";
import { AuthError, ValidationError } from "@packages/middlewares/error-handler";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { setCookie } from "../utils/cookies/setCookies";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

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
    await trackOtpRequests(email, next);
    await sendOtp(name, email, "user-activation-mail");

    res.status(200).json({
      message: 'OTP sent to email. Please verify your account.'
    })
  } catch (error) {
    return next(error);
  }
}

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, password, name } = req.body;
    if (!email || !otp || !password || !name) {
      return next(new ValidationError('All fields are required!'));
    }

    const existingUser = await prisma.users.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return next(new ValidationError('User already exists with this email!'));
    }

    await verifyOtp(email, otp, next);

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully!'
    })

  } catch (error) {
    return next(error);
  }
}

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError('All fields are required!'));
    }

    const user = await prisma.users.findUnique({
      where: {
        email
      }
    });

    if (!user) {
      return next(new ValidationError('User not found!'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return next(new ValidationError('Invalid credentials!'));
    }

    const accessToken = jwt.sign({
      id: user.id,
      role: "user"
    }, process.env.ACCESS_TOKEN_SECRET as string, {
      expiresIn: "15m"
    });

    const refreshToken = jwt.sign({
      id: user.id,
      role: "user"
    }, process.env.REFRESH_TOKEN_SECRET as string, {
      expiresIn: "7d"
    });

    setCookie(res, 'accessToken', accessToken);
    setCookie(res, 'refreshToken', refreshToken);

    res.status(200).json({
      message: 'User logged in successfully!',
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    return next(error);
  }
}

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return new JsonWebTokenError('Refresh token not found!');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: string, role: string };

    if (!decoded || !decoded.id || !decoded.role) {
      return new JsonWebTokenError('Forbidden! Invalid refresh token.');
    }

    /* let account;

    if (decoded.role === "user") */
    const user = await prisma.users.findUnique({
      where: {
        id: decoded.id
      }
    });

    if (!user) {
      return new AuthError('Forbidden! user/seller not found.');
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "15m"
      }
    );

    setCookie(res, 'access_token', newAccessToken);
    return res.status(201).json({
      success: true,
    })

  } catch (error) {
    return next(error);
  }
}

export const getUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      user
    })
  } catch (error) {
    return next(error);
  }
}

export const userForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  await handleForgotPassword(req, res, next, "user");
}

export const verifyUserForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  await verifyForgotPasswordOtp(req, res, next);
}

export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return next(new ValidationError('Email and new password are required!'));
    }

    const user = await prisma.users.findUnique({
      where: {
        email
      }
    });

    if (!user) {
      return next(new ValidationError('User not found!'));
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return next(new ValidationError('New password cannot be the same as the old password!'));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: {
        email
      },
      data: {
        password: hashedPassword
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully!'
    })
  } catch (error) {
    next(error);
  }
}

export const registerSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateRegistrationData(req.body, 'seller');
    const { name, email } = req.body;

    const existingSeller = await prisma.sellers.findUnique({
      where: {
        email
      }
    });

    if (existingSeller) {
      throw new ValidationError('Seller already exists with this email!');
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequests(email, next);
    await sendOtp(name, email, "seller-activation-mail");

    res.status(200).json({
      message: 'OTP sent to email. Please verify your account.'
    })
  } catch (error) {
    next(error);
  }
}

export const createStripeConnectLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body

    if (!sellerId) return next(new ValidationError('Seller ID is required!'));

    const seller = await prisma.sellers.findUnique({
      where: {
        id: sellerId
      }
    });

    if (!seller) {
      return next(new ValidationError('Seller is not available with this ID!'));
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: seller?.email,
      country: 'GB',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await prisma.sellers.update({
      where: {
        id: sellerId
      },
      data: {
        stripeId: account.id
      }
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.STRIPE_REDIRECT_URL,
      return_url: process.env.STRIPE_REDIRECT_URL,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });

  } catch (error) {
    return next(error);
  }
}

export const loginSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError('Email and password are required!'));
    }

    const seller = await prisma.sellers.findUnique({
      where: {
        email
      }
    });

    if (!seller) {
      return next(new ValidationError('Seller not found!'));
    }

    const isSamePassword = await bcrypt.compare(password, seller.password);

    if (!isSamePassword) {
      return next(new ValidationError('Invalid email or password!'));
    }

    const accessToken = jwt.sign({ id: seller.id, role: 'seller' }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

    const refreshToken = jwt.sign({ id: seller.id, role: 'seller' }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

    setCookie(res, 'seller-access-token', accessToken);
    setCookie(res, 'seller-refresh-token', refreshToken);

    res.status(200).json({
      message: 'Login successful!',
      seller: {
        id: seller.id, email: seller.email, name: seller.name,
      }
    });
  } catch (error) {
    next(error);
  }
}

export const getSeller = async (req: any, res: Response, next: NextFunction) => {
  try {
    const seller = req.seller;

    res.status(200).json({
      success: true,
      seller
    })
  } catch (error) {
    next(error);
  }
}
