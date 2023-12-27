import { Router } from "express";
import * as usersCtrl from '../controllers/userController';
import requireLogin from "../../../middleware/requireLogin";

const router = Router();

router.post("/", usersCtrl.signup);
router.post("/login", usersCtrl.loginLocal);
router.put("/password", requireLogin, usersCtrl.updatePassword);
router.put("/", requireLogin, usersCtrl.updateUserDetails);
router.delete("/", requireLogin, usersCtrl.deleteUser);
router.post("/confirm-delete", requireLogin, usersCtrl.confirmDeleteUser);
router.post('/verify-email', usersCtrl.verifyEmail);
router.post('/resend-email', usersCtrl.resendEmail);

export default router;