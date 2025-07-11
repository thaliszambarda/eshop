import express, { Router } from "express";
import { createStripeConnectLink, getSeller, getUser, loginSeller, loginUser, refreshToken, registerSeller, resetUserPassword, userForgotPassword, userRegistration, verifyUser, verifyUserForgotPassword} from "../controller/auth.controller";
import isAuthenticated from "@packages/middlewares/isAuthenticated";
import { createShop, verifySeller } from "../utils/auth-helper";
import { isSeller } from "@packages/middlewares/authorizeRoles";

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
router.post("/create-stripe-link", createStripeConnectLink);
router.post("/login-seller", loginSeller);
router.get("/logged-in-seller", isAuthenticated, isSeller, getSeller);

export default router;
