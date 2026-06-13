-- AI Insights table: stores generated daily & weekly AI reflections

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('daily', 'weekly')),
  period      TEXT        NOT NULL,   -- daily: 'yyyy-MM-dd'  weekly: 'yyyy-MM-dd_yyyy-MM-dd'
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, type, period)
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insights"
  ON public.ai_insights
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_insights_user_type_period
  ON public.ai_insights (user_id, type, period DESC);
