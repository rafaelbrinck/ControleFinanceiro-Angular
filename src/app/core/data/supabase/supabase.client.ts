import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://gybxgmbctvccqmuqidta.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5YnhnbWJjdHZjY3FtdXFpZHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjk3OTEsImV4cCI6MjA2NDc0NTc5MX0.r5m8x0zDcfUD-FwNDwpPMctnaU_DSJxYAzH7wAPqxLM'
);
