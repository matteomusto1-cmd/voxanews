-- ============================================================
-- VoxaNews — schema database (da eseguire una sola volta)
-- ============================================================

create extension if not exists pgcrypto;

-- Tabella articoli
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('politica','economia','tecnologia','cultura','sport','opinioni')),
  title text not null,
  excerpt text,
  author text not null,
  read_minutes int not null default 3,
  image_url text,
  image_alt text,
  featured boolean not null default false
);

alter table public.articles enable row level security;

-- Lettura pubblica: chiunque visiti il sito può leggere gli articoli
create policy "Public read access on articles"
  on public.articles for select
  using (true);

-- Scrittura riservata: solo utenti autenticati (l'account che creerai per il pannello di redazione)
create policy "Authenticated users can insert articles"
  on public.articles for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update articles"
  on public.articles for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete articles"
  on public.articles for delete
  using (auth.role() = 'authenticated');

-- ============================================================
-- Bucket di storage per le immagini degli articoli
-- ============================================================

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

create policy "Public read access on article images"
  on storage.objects for select
  using (bucket_id = 'article-images');

create policy "Authenticated users can upload article images"
  on storage.objects for insert
  with check (bucket_id = 'article-images' and auth.role() = 'authenticated');

create policy "Authenticated users can delete article images"
  on storage.objects for delete
  using (bucket_id = 'article-images' and auth.role() = 'authenticated');

-- ============================================================
-- Aggiornamento: campo per il testo completo dell'articolo
-- (esegui solo questa parte se la tabella esiste già)
-- ============================================================
alter table public.articles add column if not exists content text;

-- ============================================================
-- Aggiornamento: distinzione tra lettori registrati e redazione
-- (esegui questa parte per abilitare le registrazioni pubbliche in sicurezza)
-- ============================================================

-- Tabella che elenca chi ha i permessi di redazione (whitelist)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

create policy "Users can check their own admin status"
  on public.admins for select
  using (auth.uid() = user_id);

-- Sostituisce le vecchie regole: ora solo chi è nella tabella admins
-- può creare, modificare o eliminare articoli (non più "chiunque sia loggato")
drop policy if exists "Authenticated users can insert articles" on public.articles;
drop policy if exists "Authenticated users can update articles" on public.articles;
drop policy if exists "Authenticated users can delete articles" on public.articles;

create policy "Only admins can insert articles"
  on public.articles for insert
  with check (auth.uid() in (select user_id from public.admins));

create policy "Only admins can update articles"
  on public.articles for update
  using (auth.uid() in (select user_id from public.admins));

create policy "Only admins can delete articles"
  on public.articles for delete
  using (auth.uid() in (select user_id from public.admins));

-- Stessa restrizione per il caricamento/eliminazione immagini
drop policy if exists "Authenticated users can upload article images" on storage.objects;
drop policy if exists "Authenticated users can delete article images" on storage.objects;

create policy "Only admins can upload article images"
  on storage.objects for insert
  with check (bucket_id = 'article-images' and auth.uid() in (select user_id from public.admins));

create policy "Only admins can delete article images"
  on storage.objects for delete
  using (bucket_id = 'article-images' and auth.uid() in (select user_id from public.admins));

-- Aggiungi te stesso come admin (sostituisci con la tua email)
insert into public.admins (user_id)
select id from auth.users where email = 'la-tua-email-qui@esempio.it'
on conflict do nothing;

-- ============================================================
-- Aggiornamento: attiva l'invio email quando viene pubblicato
-- un nuovo articolo, senza passare dalla sezione "Webhooks"
-- dell'interfaccia (che su alcune versioni del pannello non è visibile)
-- ============================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_notify_new_article()
returns trigger
language plpgsql
security definer
as $$
begin
  perform
    net.http_post(
      url := 'https://dvzoysgzpshztlcbijmj.supabase.co/functions/v1/notify-new-article',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em95c2d6cHNoenRsY2Jpam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzM3OTEsImV4cCI6MjA5OTg0OTc5MX0.i9vQYsBWP-zyTqnhq3RQrtpd8k-38SgEbGr-4g5V53U'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  return NEW;
end;
$$;

drop trigger if exists on_new_article_notify on public.articles;

create trigger on_new_article_notify
after insert on public.articles
for each row execute function public.trigger_notify_new_article();

-- ============================================================
-- Aggiornamento: chiudi gli avvisi di sicurezza del Security Advisor
-- sulla funzione del trigger email
-- ============================================================

-- Fissa lo schema di ricerca (evita ambiguità potenzialmente sfruttabili)
alter function public.trigger_notify_new_article() set search_path = public;

-- Impedisce che la funzione sia richiamabile direttamente dall'esterno:
-- resta utilizzabile solo dal trigger stesso, che non richiede questi permessi
revoke execute on function public.trigger_notify_new_article() from public;
revoke execute on function public.trigger_notify_new_article() from anon;
revoke execute on function public.trigger_notify_new_article() from authenticated;

-- ============================================================
-- Aggiornamento: pubblicazione programmata degli articoli
-- ============================================================

alter table public.articles add column if not exists publish_at timestamptz not null default now();
alter table public.articles add column if not exists notified boolean not null default false;

-- I lettori vedono solo gli articoli già pubblicati; la redazione li vede tutti (anche quelli programmati nel futuro)
drop policy if exists "Public read access on articles" on public.articles;

create policy "Public can read published articles, admins can read all"
  on public.articles for select
  using (
    publish_at <= now()
    or auth.uid() in (select user_id from public.admins)
  );

-- Aggiorna il trigger: invia la notifica email SOLO se l'articolo è già pubblicato ora
-- (se è programmato per il futuro, ci penserà il controllo periodico qui sotto)
create or replace function public.trigger_notify_new_article()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.publish_at <= now() then
    perform net.http_post(
      url := 'https://dvzoysgzpshztlcbijmj.supabase.co/functions/v1/notify-new-article',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em95c2d6cHNoenRsY2Jpam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzM3OTEsImV4cCI6MjA5OTg0OTc5MX0.i9vQYsBWP-zyTqnhq3RQrtpd8k-38SgEbGr-4g5V53U'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
    update public.articles set notified = true where id = NEW.id;
  end if;
  return NEW;
end;
$$;

revoke execute on function public.trigger_notify_new_article() from public, anon, authenticated;

-- Funzione che controlla periodicamente gli articoli programmati il cui orario è arrivato,
-- e manda la notifica email a quel punto (invece che al momento del caricamento)
create or replace function public.process_scheduled_articles()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  for a in
    select * from public.articles
    where publish_at <= now() and notified = false
  loop
    perform net.http_post(
      url := 'https://dvzoysgzpshztlcbijmj.supabase.co/functions/v1/notify-new-article',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em95c2d6cHNoenRsY2Jpam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzM3OTEsImV4cCI6MjA5OTg0OTc5MX0.i9vQYsBWP-zyTqnhq3RQrtpd8k-38SgEbGr-4g5V53U'
      ),
      body := jsonb_build_object('record', row_to_json(a))
    );
    update public.articles set notified = true where id = a.id;
  end loop;
end;
$$;

revoke execute on function public.process_scheduled_articles() from public, anon, authenticated;

-- Attiva il controllo automatico ogni 5 minuti
create extension if not exists pg_cron;

select cron.schedule(
  'process-scheduled-articles-every-5-min',
  '*/5 * * * *',
  $$select public.process_scheduled_articles();$$
);

-- ============================================================
-- Aggiornamento: sezione commenti sugli articoli, con filtro
-- automatico contro linguaggio offensivo
-- ============================================================

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  content text not null
);

alter table public.comments enable row level security;

create policy "Public can read comments"
  on public.comments for select
  using (true);

create policy "Logged-in users can post their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments, admins can delete any"
  on public.comments for delete
  using (auth.uid() = user_id or auth.uid() in (select user_id from public.admins));

-- Elenco di parole non consentite nei commenti (puoi aggiungerne altre in qualsiasi momento
-- con: insert into public.banned_words (word) values ('parola');)
create table if not exists public.banned_words (
  word text primary key
);

insert into public.banned_words (word) values
  ('stronzo'), ('stronza'), ('coglione'), ('cogliona'), ('idiota'),
  ('deficiente'), ('merda'), ('bastardo'), ('bastarda'), ('troia'),
  ('puttana'), ('vaffanculo'), ('cazzo'), ('cazzata'), ('minchia'),
  ('scemo'), ('scema'), ('imbecille'), ('rincoglionito')
on conflict (word) do nothing;

-- Blocca a livello di database qualsiasi commento che contenga una di queste parole,
-- anche se qualcuno provasse a scrivere direttamente senza passare dal sito
create or replace function public.check_comment_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bad_word text;
  lowered text;
begin
  lowered := lower(NEW.content);
  for bad_word in select word from public.banned_words loop
    if lowered like '%' || bad_word || '%' then
      raise exception 'Il commento contiene linguaggio non consentito.';
    end if;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists trigger_check_comment_content on public.comments;

create trigger trigger_check_comment_content
before insert or update on public.comments
for each row execute function public.check_comment_content();
