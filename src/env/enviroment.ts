import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://dpivyvbtfymdejqnuuvw.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaXZ5dmJ0ZnltZGVqcW51dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MzYwOTksImV4cCI6MjA4MDIxMjA5OX0.qhjmIw4iYDsY6o09pQ1HrcTBVyOOm-5tmxMkrue82tc';
export const supabase = createClient(supabaseUrl, supabaseKey);
