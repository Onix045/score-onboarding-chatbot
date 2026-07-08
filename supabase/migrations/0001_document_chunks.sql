-- Vector storage for the approved S.C.O.R.E. knowledge base chunks.
-- Written for the RAG support pipeline described in docs/rag-architecture.md.

create extension if not exists vector;

create table if not exists document_chunks (
  id text primary key,
  source_path text not null,
  category text not null,
  title text not null,
  chunk_index integer not null,
  content text not null,
  token_count integer not null,
  embedding vector(512),           -- dimension must match VOYAGE_EMBEDDING_MODEL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists document_chunks_source_path_idx on document_chunks (source_path);

alter table document_chunks enable row level security;
-- No policies are created: the anon/authenticated roles get zero access.
-- Only the service-role key (used exclusively by the server) can read/write this table.

create or replace function match_document_chunks (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  source_path text,
  category text,
  title text,
  chunk_index int,
  content text,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.source_path,
    d.category,
    d.title,
    d.chunk_index,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from document_chunks d
  where 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
