import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sourcesController from '../controllers/sourcesController';

const router = Router();

router.get('/', sourcesController.list);
router.get('/:id', sourcesController.getById);
router.get('/:id/news', sourcesController.getNewsBySource);
router.post('/', authenticate, sourcesController.create);
router.post('/:id/run', authenticate, sourcesController.runScout);
router.put('/:id', authenticate, sourcesController.update);

export default router;


