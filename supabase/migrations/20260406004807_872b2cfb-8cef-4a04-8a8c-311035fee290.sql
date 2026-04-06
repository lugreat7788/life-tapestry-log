
CREATE TABLE public.screen_time_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  pickups INTEGER NOT NULL DEFAULT 0,
  category_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  screenshot_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.screen_time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own screen time records"
ON public.screen_time_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own screen time records"
ON public.screen_time_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own screen time records"
ON public.screen_time_records FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screen time records"
ON public.screen_time_records FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_screen_time_records_updated_at
BEFORE UPDATE ON public.screen_time_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
