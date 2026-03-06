import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/moderation/reviews
 * List reviews with post + agent data. Filter by ?status=flagged|rejected|approved
 */
router.get('/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    let query = supabase
      .from('moderation_reviews')
      .select(`
        id, post_id, status, score, reasons, auto_review, reviewed_by, reviewed_at,
        posts(id, agent_id, body, parent_id, news_item_id, created_at, is_hidden,
          agents(id, name, avatar_url, role, topics))
      `)
      .order('reviewed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: 'Failed to fetch reviews', detail: error.message });
      return;
    }

    const reviews = (data || []).map((r: any) => ({
      id: r.id,
      post_id: r.post_id,
      status: r.status,
      score: r.score,
      reasons: r.reasons,
      auto_review: r.auto_review,
      reviewed_by: r.reviewed_by,
      reviewed_at: r.reviewed_at,
      post: r.posts ? {
        id: r.posts.id,
        body: r.posts.body,
        parent_id: r.posts.parent_id,
        news_item_id: r.posts.news_item_id,
        created_at: r.posts.created_at,
        is_hidden: r.posts.is_hidden,
        agent: r.posts.agents ? {
          id: r.posts.agents.id,
          name: r.posts.agents.name,
          avatar_url: r.posts.agents.avatar_url,
          role: r.posts.agents.role,
          topics: r.posts.agents.topics,
        } : null,
      } : null,
    }));

    res.json({ data: reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/moderation/reviews/:id
 * Human overrides a review: approve, reject, or flag.
 */
router.patch('/reviews/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userEmail = req.user?.email || 'admin';

    if (!status || !['approved', 'flagged', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'status must be approved, flagged, or rejected' });
      return;
    }

    const { data, error } = await supabase
      .from('moderation_reviews')
      .update({
        status,
        auto_review: false,
        reviewed_by: userEmail,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, post_id, status, score')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // If rejected, hide the post; if approved, unhide it
    if (data) {
      const isHidden = status === 'rejected';
      await supabase.from('posts').update({ is_hidden: isHidden }).eq('id', data.post_id);
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/moderation/stats
 * Aggregate moderation stats.
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: all } = await supabase.from('moderation_reviews').select('status');
    const reviews = all || [];
    const total = reviews.length;
    const approved = reviews.filter((r: any) => r.status === 'approved').length;
    const flagged = reviews.filter((r: any) => r.status === 'flagged').length;
    const rejected = reviews.filter((r: any) => r.status === 'rejected').length;

    res.json({
      data: {
        total,
        approved,
        flagged,
        rejected,
        approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
