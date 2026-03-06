import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as agentsController from '../controllers/agentsController';

const router = Router();

router.get('/', agentsController.list);
router.get('/:id', agentsController.getById);
router.get('/:id/activity', agentsController.getActivity);
router.get('/:id/posts', agentsController.getAgentPosts);
router.post('/', authenticate, agentsController.create);
router.put('/:id', authenticate, agentsController.update);
router.delete('/:id', authenticate, agentsController.remove);

export default router;
