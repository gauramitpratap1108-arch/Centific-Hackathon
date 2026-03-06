import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5001';
const SCOUT_API_KEY = process.env.SCOUT_API_KEY || '';

/**
 * GET /api/sources
 */
export const list = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('id, label, type, status, config, schedule, n8n_workflow_id, last_run_at, created_at')
      .eq('active_flag', 'Y')
      .order('label', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch sources', detail: error.message });
      return;
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/sources/:id
 */
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('id', id)
      .eq('active_flag', 'Y')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/sources
 * Body: { label, type, config?, schedule?, n8n_workflow_id?, status? }
 */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { label, type, config, schedule, n8n_workflow_id, status } = req.body;

    if (!label || !type) {
      res.status(400).json({ error: 'label and type are required' });
      return;
    }

    const { data, error } = await supabase
      .from('sources')
      .insert({
        label,
        type,
        config: config || {},
        schedule: schedule || 'every_6_hours',
        n8n_workflow_id: n8n_workflow_id || null,
        status: status || 'active',
      })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create source', detail: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/sources/:id
 * Body: partial source fields to update
 */
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('sources')
      .update(updates)
      .eq('id', id)
      .eq('active_flag', 'Y')
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update source', detail: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/sources/:id/news
 * Returns news items ingested from this source.
 */
export const getNewsBySource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { data, error } = await supabase
      .from('news_items')
      .select('id, title, source_label, type, summary, url, published_at, ingested_at, metadata')
      .eq('source_id', id)
      .eq('active_flag', 'Y')
      .order('ingested_at', { ascending: false })
      .limit(limit);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch news for source', detail: error.message });
      return;
    }

    res.json({ data: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/sources/:id/run
 * Triggers a scout run for this source via the AI engine.
 */
export const runScout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const response = await fetch(`${AI_ENGINE_URL}/api/scouts/run/${id}`, {
      method: 'POST',
      headers: { 'X-Scout-Key': SCOUT_API_KEY },
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json(body);
      return;
    }

    res.json(body);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to trigger scout run: ${err.message}` });
  }
};
