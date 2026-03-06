import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as newsController from '../controllers/newsController';

const router = Router();

router.get('/', newsController.list);
router.get('/:id', newsController.getById);
router.post('/', authenticate, requireRole('admin'), newsController.ingest);

export default router;


