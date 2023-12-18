import { Router } from 'express';
import * as friendCtrl from './friendController';
import * as giftCtrl from '../recommendation/giftRecommendationController';
import requireLogin from '../../middleware/requireLogin';
import allowOnlyImageUpload from '../../middleware/allowOnlyImageUpload';
import compressAndResizeImage from '../../middleware/compressAndResizeImage';

const router = Router();

router.post('/create', requireLogin, friendCtrl.addFriend);
router.get('/', requireLogin, friendCtrl.findFriends);
router.get('/birthdays', requireLogin, friendCtrl.getFriendBirthdays);
router.get('/:id', requireLogin, friendCtrl.showFriend);
router.delete('/:id/delete', requireLogin, friendCtrl.deleteFriend);
router.put('/:id/update', requireLogin, friendCtrl.updateFriend);
router.post('/:id/tags', requireLogin, friendCtrl.updateTags);
router.post('/:id/upload', requireLogin, allowOnlyImageUpload, compressAndResizeImage, friendCtrl.uploadFriendPhoto);
router.post('/:id/generate-gift', requireLogin, giftCtrl.recommendGift);
router.post('/:id/favorites', requireLogin, giftCtrl.favoriteGift);
router.delete('/:id/favorites/:favoriteId', requireLogin, giftCtrl.removeFavorite);
router.put('/update-notification-inclusion', requireLogin, friendCtrl.updateNotificationInclusion);

export default router;