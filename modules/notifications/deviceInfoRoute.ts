import { Router } from "express";
import requireLogin from "../../middleware/requireLogin";
import { createOrReassign } from "./deviceInfoController";

const router = Router();

router.post('/', requireLogin, createOrReassign);

export default router;