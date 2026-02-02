-- Supabase pgvector 설정
-- Supabase 대시보드 > SQL Editor에서 실행

-- 1. pgvector 확장 활성화
create extension if not exists vector;

-- 2. documents 테이블 생성 (768차원 = Gemini embedding)
create table if not exists documents (
  id text primary key,
  embedding vector(768),
  title text,
  content text,
  url text,
  doc_type text default 'flutter-docs',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 벡터 인덱스 생성 (코사인 유사도)
create index if not exists documents_embedding_idx
on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. 유사도 검색 함수
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id text,
  title text,
  content text,
  url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.title,
    documents.content,
    documents.url,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. RLS 정책 (공개 읽기, 서비스 키로만 쓰기)
alter table documents enable row level security;

create policy "Public read access"
  on documents for select
  using (true);

create policy "Service role can insert"
  on documents for insert
  with check (true);

create policy "Service role can update"
  on documents for update
  using (true);

create policy "Service role can delete"
  on documents for delete
  using (true);

-- 6. 증분 동기화용 메타데이터 테이블
create table if not exists sync_metadata (
  file_path text primary key,
  github_sha text not null,
  updated_at timestamptz default now()
);

alter table sync_metadata enable row level security;

create policy "Service role full access"
  on sync_metadata for all
  using (true)
  with check (true);
