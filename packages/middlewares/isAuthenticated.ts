import prisma from "@packages/libs/prisma";
import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];

    if(!token) {
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

    const account = await prisma.users.findUnique({
      where: {
        id: decoded.id
      }
    });


    req.user = account;

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
