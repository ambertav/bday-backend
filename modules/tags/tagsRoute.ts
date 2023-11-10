import { Router } from 'express';
import * as tagCtrl from './tagController';
const router = Router();

router.get('/', tagCtrl.getDefaultTags);
router.get('/suggestions', tagCtrl.getTagSuggestions);


export default router;