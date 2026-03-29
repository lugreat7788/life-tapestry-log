ALTER TABLE public.emotion_records ADD COLUMN IF NOT EXISTS person text DEFAULT '自己';
ALTER TABLE public.emotion_records ADD COLUMN IF NOT EXISTS reflection text;