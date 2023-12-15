import { Router } from 'express';
import requireLogin from '../../middleware/requireLogin';
import * as notifCtrl from './notificationController';

const router = Router();

router.get('/', requireLogin, notifCtrl.getNotifications);
router.put('/read', requireLogin, notifCtrl.markNotiicationAsRead);


export default router;