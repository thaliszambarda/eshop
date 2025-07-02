import express, { Router } from "express";
import { getUser, loginUser, refreshToken, registerSeller, resetUserPassword, userForgotPassword, userRegistration, verifyUser, verifyUserForgotPassword} from "../controller/auth.controller";
import isAuthenticated from "@packages/middlewares/isAuthenticated";
import { createShop, verifySeller } from "../utils/auth-helper";

const router: Router = express.Router();

router.post('/user-registration', userRegistration);
router.post('/verify-user', verifyUser);
router.post("/login-user", loginUser);
router.post("/refresh-token-user", refreshToken);
router.get("/logged-in-user", isAuthenticated, getUser);
router.post("/user-forgot-password", userForgotPassword);
router.post("/reset-user-password", resetUserPassword);
router.post("/verify-user-forgot-password", verifyUserForgotPassword);
router.post("/seller-registration", registerSeller);
router.post("/verify-seller", verifySeller);
router.post("/create-shop", createShop);

export default router;
