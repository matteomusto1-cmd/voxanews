// ============================================================
// VoxaNews — connessione al database Supabase
// ============================================================

const SUPABASE_URL = 'https://dvzoysgzpshztlcbijmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em95c2d6cHNoenRsY2Jpam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzM3OTEsImV4cCI6MjA5OTg0OTc5MX0.i9vQYsBWP-zyTqnhq3RQrtpd8k-38SgEbGr-4g5V53U';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
