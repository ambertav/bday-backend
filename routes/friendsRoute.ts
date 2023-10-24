import { Router } from 'express';
import * as friendCtrl from '../controllers/friendController';
import requireLogin from '../middleware/requireLogin';

const router = Router();

router.post('/create', requireLogin, friendCtrl.addFriend);
router.get('/', requireLogin, friendCtrl.findFriends);
router.get('/:id', requireLogin, friendCtrl.showFriend);
router.delete('/:id/delete', requireLogin, friendCtrl.deleteFriend);
router.put('/:id/update', requireLogin, friendCtrl.updateFriend);


export default router;