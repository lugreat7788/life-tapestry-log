
-- Emotion records table
CREATE TABLE public.emotion_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  emotion_type TEXT NOT NULL DEFAULT 'neutral',
  intensity INTEGER NOT NULL DEFAULT 5,
  trigger TEXT,
  thoughts TEXT,
  coping_strategy TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emotion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emotion records" ON public.emotion_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own emotion records" ON public.emotion_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own emotion records" ON public.emotion_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own emotion records" ON public.emotion_records FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_emotion_records_updated_at BEFORE UPDATE ON public.emotion_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Relationship records table
CREATE TABLE public.relationship_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  person TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  solution TEXT,
  reflection TEXT,
  status TEXT NOT NULL DEFAULT 'unresolved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.relationship_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relationship records" ON public.relationship_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own relationship records" ON public.relationship_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relationship records" ON public.relationship_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own relationship records" ON public.relationship_records FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_relationship_records_updated_at BEFORE UPDATE ON public.relationship_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
