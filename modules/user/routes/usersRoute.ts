import { Router } from "express";
import * as usersCtrl from '../controllers/userController';
import requireLogin from "../../../middleware/requireLogin";

const router = Router();

router.post("/", usersCtrl.signup);
router.post("/login", usersCtrl.webLogin);
router.post("/mobile/login", usersCtrl.mobileLogin);
router.post("/refresh", usersCtrl.refresh);
router.get("/logout", usersCtrl.logout);
router.put("/password", requireLogin, usersCtrl.updatePassword);
router.delete("/", requireLogin, usersCtrl.deleteUser);
router.post("/confirm-delete", requireLogin, usersCtrl.confirmDeleteUser);
router.post('/verify-email', usersCtrl.verifyEmail);
router.post('/resend-email', usersCtrl.resendVerifyEmail);
router.post('/forgot-password', usersCtrl.emailForgotPassword);
router.post('/reset-password', usersCtrl.resetPassword);


export default router;