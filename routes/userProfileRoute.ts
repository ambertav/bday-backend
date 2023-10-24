import { Router } from "express";
import * as userProfileCtrl from '../controllers/userProfileController';
import requireLogin from "../middleware/requireLogin";

const router = Router();

router.post('/upload', requireLogin, userProfileCtrl.uploadUserPhoto);
router.put('/', userProfileCtrl.updateProfileDetails);
router.get('/', userProfileCtrl.getUserProfile);

export default router;