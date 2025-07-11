import prisma from "@packages/libs/prisma";
import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies["access_token"] || req.cookies["seller-access-token"] || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized! token missing'
      });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { id: string, role: "user" | "seller" };

    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized! Invalid token'
      });
    }

    let account;

    if (decoded.role === "user") {
      account = await prisma.users.findUnique({
        where: {
          id: decoded.id
        }
      });
    }

    if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({
        where: {
          id: decoded.id
        },
        include: {
          shop: true
        }
      });

      req.seller = account;
    }

    req.role = decoded.role;

    if (!account) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized! User not found'
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized! token expired or invalid'
    })
  }
};

export default isAuthenticated;
