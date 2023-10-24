import { Router } from 'express';
import * as tagCtrl from '../controllers/tagController';
const router = Router();

router.get('/', tagCtrl.getTags);


export default router;