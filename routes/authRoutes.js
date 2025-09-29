import passport from 'passport';
import express from 'express';
import { googleSignInController } from '../controllers/authController.js';
import dotenv from 'dotenv';

dotenv.config();

const authRouter = express.Router();
const googleSignIn = new googleSignInController();

// OAuth2 login with Google
authRouter.get("/google", passport.authenticate('google', { scope: ['email', 'profile'] }));

// Google OAuth2 callback
authRouter.get("/google/callback",
    passport.authenticate("google", {
        successRedirect: process.env.CLIENT_URL,
        failureRedirect: "/auth/login/failed" // Điều chỉnh đường dẫn cho nhất quán
    })
);

// Routes for handling login success and failure
authRouter.get("/auth/login/success", googleSignIn.signInSuccess);
authRouter.get("/auth/login/failed", googleSignIn.signInFailed);

export default authRouter;