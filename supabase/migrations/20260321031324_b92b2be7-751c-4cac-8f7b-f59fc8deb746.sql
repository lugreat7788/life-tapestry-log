
-- Create todo_collections table
CREATE TABLE public.todo_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.todo_collections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own collections" ON public.todo_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own collections" ON public.todo_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own collections" ON public.todo_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own collections" ON public.todo_collections FOR DELETE USING (auth.uid() = user_id);

-- Add collection_id to todos table
ALTER TABLE public.todos ADD COLUMN collection_id UUID REFERENCES public.todo_collections(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_todo_collections_updated_at BEFORE UPDATE ON public.todo_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
