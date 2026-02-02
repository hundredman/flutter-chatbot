-- Supabase 보안 경고 해결
-- Supabase 대시보드 > SQL Editor에서 실행

-- 1. 기존 RLS 정책 삭제
drop policy if exists "Service role can insert" on documents;
drop policy if exists "Service role can update" on documents;
drop policy if exists "Service role can delete" on documents;
drop policy if exists "Service role full access" on sync_metadata;

-- 2. documents 테이블: service_role만 쓰기 가능하도록 수정
-- (anon 키로는 SELECT만 가능, INSERT/UPDATE/DELETE 불가)
create policy "Service role can insert"
  on documents for insert
  to service_role
  with check (true);

create policy "Service role can update"
  on documents for update
  to service_role
  using (true);

create policy "Service role can delete"
  on documents for delete
  to service_role
  using (true);

-- 3. sync_metadata 테이블: service_role만 접근 가능
create policy "Service role full access"
  on sync_metadata for all
  to service_role
  using (true)
  with check (true);

-- 4. match_documents 함수 search_path 고정
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
security definer
set search_path = public
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
