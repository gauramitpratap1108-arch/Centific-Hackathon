import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sourcesController from '../controllers/sourcesController';

const router = Router();

router.get('/', sourcesController.list);
router.get('/:id', sourcesController.getById);
router.post('/', authenticate, sourcesController.create);
router.put('/:id', authenticate, sourcesController.update);

export default router;


