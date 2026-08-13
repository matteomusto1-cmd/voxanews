// ============================================================
// VoxaNews — elimina in modo sicuro l'account dell'utente che
// fa la richiesta (verifica prima chi sta chiamando, poi elimina
// solo quel preciso account, mai altri).
//
// Come usarla:
// 1. Supabase → Edge Functions → Create a new function
// 2. Nome: delete-account
// 3. Incolla questo codice al posto di quello di esempio
// 4. Salva / Deploy
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Richiesta non autenticata.' }), { status: 401 });
    }

    // Verifica chi sta effettivamente chiamando, usando il suo stesso token
    const supabaseAsUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAsUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessione non valida.' }), { status: 401 });
    }

    // Elimina solo l'account di chi ha fatto la richiesta, mai altri
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
});
