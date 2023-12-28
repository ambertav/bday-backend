import { Router } from 'express';
import requireLogin from '../../middleware/requireLogin';
import * as reminderCtrl from './reminderController';

const router = Router();

router.get('/', requireLogin, reminderCtrl.getReminders);
router.put('/read', requireLogin, reminderCtrl.markReminderAsRead);
router.delete('/:id/delete', requireLogin, reminderCtrl.deleteReminder);


export default router;