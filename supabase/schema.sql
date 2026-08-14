-- Aileyle Ne İzlenir? — Supabase şeması (Adım 3)
-- Bu dosyayı Supabase panelindeki SQL Editor'e yapıştırıp Run deyin.
-- data/*.json dosyalarındaki yapının birebir tablo karşılığıdır.

-- Yorumlar (data/comments.json)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  name text not null default '',
  liked boolean,                -- null: belirtilmedi
  risk_vote text check (risk_vote in ('lower', 'correct', 'higher')),
  text text not null default '',
  -- Yorumu yazan tarayıcının anonim çerez kimliği; düzenleme/silme yetkisi.
  -- Üyelik gelince gerçek kullanıcı kimliğine taşınacak.
  owner_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists comments_tmdb_id_idx on comments (tmdb_id);

-- Analiz talep kuyruğu (data/analysis-requests.json)
create table if not exists analysis_requests (
  tmdb_id integer primary key,
  requested_at timestamptz not null default now(),
  request_count integer not null default 1,
  status text not null default 'requested',
  retry_at timestamptz,         -- kota/hata sonrası yeniden deneme zamanı
  error_count integer not null default 0
);

-- Analiz sonuçları (data/analyses/<id>.json) — yapı zaten JSON, jsonb saklanır
create table if not exists analyses (
  tmdb_id integer primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- İzleme listeleri (data/watchlists.json)
create table if not exists watchlists (
  token text not null,          -- anonim tarayıcı kimliği (commenter çerezi)
  tmdb_id integer not null,
  added_at timestamptz not null default now(),
  primary key (token, tmdb_id)
);
create index if not exists watchlists_token_idx on watchlists (token);

-- Kişisel hassasiyet profilleri: kimlik başına kategori→çarpan haritası
-- (0 önemsemem, 1 normal, 1.5 hassas, 2 çok hassas). Kimlik izleme
-- listesiyle aynı: girişli kullanıcı id'si ya da anonim çerez.
create table if not exists sensitivity_profiles (
  token text primary key,
  weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Topluluk sahne katkıları (Adım 9): altyazı analizinin kaçırdığı sahneler.
-- Oylamayla doğrulanır; net >= 1 olanlar risk hesabına katılır.
create table if not exists scene_contributions (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  category text not null check (category in
    ('short_kiss','long_kiss','sexual_dialogue','sexual_implication','explicit_sexual_content','profanity')),
  severity integer not null check (severity between 1 and 3),
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer not null,
  description text not null default '',
  owner_token text,              -- ekleyenin kimliği (silme yetkisi)
  created_at timestamptz not null default now()
);
create index if not exists scene_contributions_tmdb_idx on scene_contributions (tmdb_id);

-- Sahne oyları (Adım 10): kimlik başına tek oy; +1 doğru, -1 yanlış
create table if not exists scene_votes (
  contribution_id uuid not null references scene_contributions (id) on delete cascade,
  token text not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (contribution_id, token)
);

-- Güvenlik: RLS açık, politika yok — anon anahtar hiçbir tabloya erişemez.
-- Tüm erişim sunucu/worker üzerinden service_role anahtarıyla yapılır
-- (service_role RLS'i baypas eder). Üyelik gelince politikalar eklenecek.
alter table comments enable row level security;
alter table analysis_requests enable row level security;
alter table analyses enable row level security;
alter table watchlists enable row level security;
alter table sensitivity_profiles enable row level security;
alter table scene_contributions enable row level security;
alter table scene_votes enable row level security;

-- Profil fotoğrafları: herkese açık "avatars" depolama kovası.
-- Yazma yalnızca sunucudan service_role ile yapılır; politika gerekmez.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ── Adım 11: herkese açık profiller ve arkadaşlık ────────────────────
--
-- Kullanıcı bilgisi Supabase'in auth.users tablosunda duruyor ve oraya
-- yalnızca service_role erişebiliyor. Arkadaşının adını/fotoğrafını
-- gösterebilmek için küçük bir ayna tablo gerekiyor; kayıt olurken ve
-- profil güncellenirken buraya da yazılır.
create table if not exists profiles (
  id uuid primary key,                  -- auth.users.id
  display_name text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Arkadaşlık: tek satır iki yönü de tutar (çift kayıt yok).
-- status: pending (istek gönderildi) | accepted (kabul edildi)
-- Sorgu "arkadaşlarım" = accepted olan ve iki taraftan biri ben olan satırlar.
create table if not exists friendships (
  requester_id uuid not null,
  addressee_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  -- Kendine arkadaşlık isteği gönderilemez
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on friendships (addressee_id);

alter table profiles enable row level security;
alter table friendships enable row level security;
