import { Router } from "express";
import * as userProfileCtrl from './userProfileController';
import requireLogin from "../../middleware/requireLogin";
import allowOnlyImageUpload from "../../middleware/allowOnlyImageUpload";
import compressAndResizeImage from "../../middleware/compressAndResizeImage";

const router = Router();

router.post('/upload', requireLogin, allowOnlyImageUpload, compressAndResizeImage, userProfileCtrl.uploadUserPhoto);
router.put('/', requireLogin, userProfileCtrl.updateProfileDetails);
router.get('/', requireLogin, userProfileCtrl.getUserProfile);
router.get('/all', requireLogin, userProfileCtrl.getCurrentUser);

export default router;