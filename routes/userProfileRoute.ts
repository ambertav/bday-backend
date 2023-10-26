import { Router } from "express";
import * as userProfileCtrl from '../controllers/userProfileController';
import requireLogin from "../middleware/requireLogin";

const router = Router();

router.post('/upload', requireLogin, userProfileCtrl.uploadUserPhoto);
router.put('/', requireLogin, userProfileCtrl.updateProfileDetails);
router.get('/', requireLogin, userProfileCtrl.getUserProfile);
router.get('/all', requireLogin, userProfileCtrl.getCurrentUser);

export default router;