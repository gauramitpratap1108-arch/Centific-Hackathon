import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

/**
 * GET /api/agents
 * Query: search, sort_by (name|karma|status), status (active|paused)
 */
export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, sort_by = 'karma', status } = req.query;

    let query = supabase.from('agents').select('*').eq('active_flag', 'Y');

    // Filter by status
    if (status && (status === 'active' || status === 'paused')) {
      query = query.eq('status', status);
    }

    // Search by name or role
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,role.ilike.%${search}%`);
    }

    // Sort
    if (sort_by === 'name') {
      query = query.order('name', { ascending: true });
    } else if (sort_by === 'status') {
      query = query.order('status', { ascending: true });
    } else {
      query = query.order('karma', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: 'Failed to fetch agents', detail: error.message });
      return;
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/agents/:id
 */
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('active_flag', 'Y')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/agents
 * Body: { name, role, description?, behaviour_summary?, system_prompt?,
 *         model?, skills?, posting_frequency?, topics?, avatar_url?, status? }
 */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, role, description, behaviour_summary, system_prompt,
      model, skills, posting_frequency, topics, avatar_url, status,
    } = req.body;

    if (!name || !role) {
      res.status(400).json({ error: 'name and role are required' });
      return;
    }

    const { data, error } = await supabase
      .from('agents')
      .insert({
        name,
        role,
        description: description || null,
        behaviour_summary: behaviour_summary || null,
        system_prompt: system_prompt || null,
        model: model || null,
        skills: skills || [],
        posting_frequency: posting_frequency || 'manual',
        topics: topics || [],
        avatar_url: avatar_url || null,
        status: status || 'active',
      })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create agent', detail: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/agents/:id
 * Body: partial agent fields to update
 */
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that should not be updated directly
    delete updates.id;
    delete updates.karma;
    delete updates.post_count;
    delete updates.is_verified;
    delete updates.created_at;
    delete updates.updated_at;

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .eq('active_flag', 'Y')
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update agent', detail: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/agents/:id
 * Soft-delete: sets active_flag = 'N' instead of removing the row.
 */
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agents')
      .update({ active_flag: 'N' })
      .eq('id', id)
      .eq('active_flag', 'Y')
      .select('id')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Agent not found or already deactivated' });
      return;
    }

    res.json({ message: 'Agent deactivated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/agents/:id/activity
 * Returns the activity log for a specific agent.
 * Query: limit (default 50)
 */
export const getActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { data, error } = await supabase
      .from('agent_activity_log')
      .select('id, agent_id, action, target_id, target_type, detail, created_at')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch activity', detail: error.message });
      return;
    }

    res.json({ data: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/agents/:id/posts
 * Returns all posts made by a specific agent.
 * Query: limit (default 50)
 */
export const getAgentPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, agent_id, body, parent_id, news_item_id,
        upvote_count, downvote_count, reply_count, created_at, image_url, gif_url,
        agents!inner ( name, avatar_url, is_verified, karma ),
        news_items ( title, source_label )
      `)
      .eq('agent_id', id)
      .eq('active_flag', 'Y')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch agent posts', detail: error.message });
      return;
    }

    const mapped = (data || []).map((post: any) => ({
      id: post.id,
      agent_id: post.agent_id,
      agent_name: post.agents.name,
      agent_avatar_url: post.agents.avatar_url,
      is_verified: post.agents.is_verified,
      karma: post.agents.karma,
      body: post.body,
      created_at: post.created_at,
      reply_count: post.reply_count,
      parent_id: post.parent_id,
      news_item_id: post.news_item_id,
      news_title: post.news_items?.title || null,
      news_source: post.news_items?.source_label || null,
      upvote_count: post.upvote_count,
      downvote_count: post.downvote_count,
      image_url: post.image_url || null,
      gif_url: post.gif_url || null,
    }));

    res.json({ data: mapped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
