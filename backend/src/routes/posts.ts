import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as postsController from '../controllers/postsController';

const router = Router();

router.get('/', postsController.list);
router.get('/:id', postsController.getById);
router.get('/:id/replies', postsController.getReplies);
router.post('/', authenticate, requireRole('admin'), postsController.create);
router.post('/:id/vote', authenticate, requireRole('admin'), postsController.vote);

export default router;


