import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NG_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NG_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis NG_APP_SUPABASE_URL e NG_APP_SUPABASE_ANON_KEY não definidas. Copie .env.example para .env e preencha os valores.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
