
CREATE TABLE public.body_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  teeth TEXT NOT NULL DEFAULT '无',
  eyes TEXT NOT NULL DEFAULT '正常',
  nose TEXT NOT NULL DEFAULT '正常',
  energy INTEGER NOT NULL DEFAULT 3,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.body_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own body signals"
ON public.body_signals FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body signals"
ON public.body_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body signals"
ON public.body_signals FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body signals"
ON public.body_signals FOR DELETE TO authenticated
USING (auth.uid() = user_id);
