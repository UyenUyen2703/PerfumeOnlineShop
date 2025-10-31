import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://oyzyhjbcupqmnqnwelds.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95enloamJjdXBxbW5xbndlbGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDM3NDksImV4cCI6MjA3NzM3OTc0OX0.cAK1EFRlZ0nIl9oEZHhm1JLyhl7LVCfUmVBo5ALhO5Y';
export const supabase = createClient(supabaseUrl, supabaseKey);
