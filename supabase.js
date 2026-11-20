import { createClient } from '@supabase/supabase-js'

// A sessão fica guardada com segurança no aparelho (persistSession) e o token é renovado
// automaticamente (autoRefreshToken). Estas opções já são o padrão do Supabase Auth; ficam explícitas
// para documentar o comportamento. Não há senha nem token guardados manualmente pelo app.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
)
