import { Router } from 'express';
import requireLogin from '../../middleware/requireLogin';
import * as notifCtrl from './notificationController';

const router = Router();

router.get('/', requireLogin, notifCtrl.getNotifications);


export default router;