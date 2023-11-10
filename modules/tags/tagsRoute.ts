import { Router } from 'express';
import * as tagCtrl from './tagController';
const router = Router();

router.get('/', tagCtrl.getDefaultTags);


export default router;