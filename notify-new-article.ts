// ============================================================
// VoxaNews — invia una email a tutti i lettori registrati
// ogni volta che viene pubblicato un nuovo articolo (anche se
// pubblicato in modo programmato per una data/ora futura).
//
// Come usarla:
// 1. Supabase → Edge Functions → notify-new-article
// 2. Sostituisci tutto il codice con questo
// 3. Salva / Deploy
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = 'https://voxanews.net';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CATEGORY_LABELS: Record<string, string> = {
  politica: 'Politica',
  economia: 'Economia',
  tecnologia: 'Tecnologia',
  cultura: 'Cultura',
  sport: 'Sport',
  opinioni: 'Opinioni',
};

function buildEmailHtml(firstName: string, categoryLabel: string, article: any, articleUrl: string) {
  const greeting = firstName ? `Ciao ${firstName},` : 'Ciao,';
  return `
  <div style="background-color:#F9FAFB; padding: 40px 20px; font-family: Georgia, 'Times New Roman', serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E7EB;">

      <div style="background-color: #111827; padding: 24px 32px;">
        <p style="margin:0; color:#ffffff; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">VoxaNews</p>
      </div>

      <div style="padding: 32px;">
        <p style="font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 15px; color: #111827; margin: 0 0 24px;">${greeting}</p>
        <p style="font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 24px;">Abbiamo appena pubblicato un nuovo articolo che potrebbe interessarti.</p>

        <p style="font-family: -apple-system, Helvetica, Arial, sans-serif; text-transform: uppercase; letter-spacing: 1.5px; color: #7A2E2E; font-size: 12px; font-weight: 700; margin: 0 0 10px;">${categoryLabel}</p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.3; color: #111827; margin: 0 0 16px;">${article.title}</h1>
        <p style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #4B5563; font-size: 15px; line-height: 1.7; margin: 0 0 28px;">${article.excerpt || ''}</p>

        <a href="${articleUrl}" style="display: inline-block; background: #7A2E2E; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 2px; font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600;">Leggi l'articolo →</a>
      </div>

      <div style="padding: 20px 32px; border-top: 1px solid #E5E7EB;">
        <p style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #9CA3AF; font-size: 12px; line-height: 1.6; margin: 0;">Ricevi questa email perché sei registrato su VoxaNews. Puoi gestire il tuo account in qualsiasi momento accedendo al sito.</p>
      </div>

    </div>
  </div>
  `;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const article = payload.record;

    if (!article) {
      return new Response(JSON.stringify({ error: 'Nessun articolo trovato nel payload.' }), { status: 400 });
    }

    // Prende tutti gli utenti registrati con nome e email (richiede la service role key)
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const recipients = (usersData?.users || [])
      .filter((u) => !!u.email && u.user_metadata?.notify_articles !== false)
      .map((u) => ({
        email: u.email as string,
        firstName: (u.user_metadata?.first_name as string) || '',
      }));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Nessun lettore registrato da notificare.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const articleUrl = `${SITE_URL}/articoli/${article.id}.html`;
    const categoryLabel = CATEGORY_LABELS[article.category] || article.category;

    const results = [];
    for (const { email, firstName } of recipients) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'VoxaNews <notizie@voxanews.net>',
          to: [email],
          subject: `Nuovo articolo su VoxaNews: ${article.title}`,
          html: buildEmailHtml(firstName, categoryLabel, article, articleUrl),
        }),
      });
      results.push({ email, status: res.status });
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
});
