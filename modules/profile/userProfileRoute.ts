import { Router } from "express";
import * as userProfileCtrl from './userProfileController';
import requireLogin from "../../middleware/requireLogin";
import allowOnlyImageUpload from "../../middleware/allowOnlyImageUpload";

const router = Router();

router.post('/upload', requireLogin, allowOnlyImageUpload, userProfileCtrl.uploadUserPhoto);
router.put('/', requireLogin, userProfileCtrl.updateProfileDetails);
router.get('/', requireLogin, userProfileCtrl.getUserProfile);
router.get('/all', requireLogin, userProfileCtrl.getCurrentUser);

export default router;