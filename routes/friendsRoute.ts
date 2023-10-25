import { Router } from 'express';
import * as friendCtrl from '../controllers/friendController';
import * as giftCtrl from '../controllers/giftRecommendationController';
import requireLogin from '../middleware/requireLogin';

const router = Router();

router.post('/create', requireLogin, friendCtrl.addFriend);
router.get('/', requireLogin, friendCtrl.findFriends);
router.get('/:id', requireLogin, friendCtrl.showFriend);
router.delete('/:id/delete', requireLogin, friendCtrl.deleteFriend);
router.put('/:id/update', requireLogin, friendCtrl.updateFriend);
router.post('/:id/tags', requireLogin, friendCtrl.addTag);
router.delete('/:id/tags/:tagId', requireLogin, friendCtrl.removeTag);
router.post('/:id/preferences', requireLogin, friendCtrl.addPreference);
router.post('/:id/preferences/remove', requireLogin, friendCtrl.removePreference);
router.post('/:id/upload', requireLogin, friendCtrl.uploadFriendPhoto);
router.post('/:id/generate-gift', requireLogin, giftCtrl.recommendGift);
router.post('/:id/favorites', requireLogin, giftCtrl.favoriteGift);
router.get('/:id/favorites', requireLogin, giftCtrl.getFavoritesOfFriend);
router.delete('/:id/favorites/:favoriteId', requireLogin, giftCtrl.removeFavorite);

export default router;