import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NG_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NG_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis NG_APP_SUPABASE_URL e NG_APP_SUPABASE_ANON_KEY não definidas. Copie .env.example para .env e preencha os valores.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Evita conflito do Navigator LockManager com zone.js (Angular).
    // O erro no console é cosmético; auth continua ok sem o lock nativo.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
