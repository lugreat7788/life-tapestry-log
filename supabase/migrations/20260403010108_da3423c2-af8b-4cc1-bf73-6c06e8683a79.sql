CREATE TABLE public.skip_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  module_key text NOT NULL,
  reason text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.skip_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skip reasons"
ON public.skip_reasons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skip reasons"
ON public.skip_reasons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skip reasons"
ON public.skip_reasons FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_skip_reasons_user_date ON public.skip_reasons(user_id, date);
CREATE INDEX idx_skip_reasons_item ON public.skip_reasons(user_id, item_id);