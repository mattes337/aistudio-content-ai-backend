-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom enum types
CREATE TYPE channel_type AS ENUM ('website', 'instagram', 'facebook', 'x', 'newsletter');
CREATE TYPE platform_api AS ENUM ('none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api');
CREATE TYPE media_type AS ENUM ('instagram_post', 'article_feature', 'article_inline', 'icon');
CREATE TYPE article_status AS ENUM ('draft', 'approved', 'scheduled', 'published', 'archived');
CREATE TYPE post_status AS ENUM ('draft', 'approved', 'scheduled', 'published', 'deleted');
CREATE TYPE knowledge_source_type AS ENUM ('text', 'website', 'pdf', 'instagram', 'youtube', 'video_file', 'audio_file');
CREATE TYPE processing_status AS ENUM ('pending', 'processed', 'error');
CREATE TYPE embedding_status AS ENUM ('pending', 'complete', 'failed');
CREATE TYPE recipient_status AS ENUM ('subscribed', 'unsubscribed');

-- Create tables
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    type channel_type NOT NULL,
    platform_api platform_api NOT NULL,
    credentials JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    type media_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    title_image_url TEXT,
    title_image_alt TEXT,
    inline_images JSONB,
    status article_status NOT NULL DEFAULT 'draft',
    publish_date TIMESTAMPTZ,
    author VARCHAR(255),
    excerpt TEXT,
    categories TEXT[],
    tags TEXT[],
    seo JSONB,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    background_image_url TEXT NOT NULL,
    base_background_image_url TEXT,
    overlays JSONB,
    status post_status NOT NULL DEFAULT 'draft',
    publish_date TIMESTAMPTZ,
    platform VARCHAR(50) NOT NULL,
    tags TEXT[],
    location VARCHAR(255),
    tagged_users TEXT[],
    alt_text TEXT,
    disable_comments BOOLEAN DEFAULT FALSE,
    hide_likes BOOLEAN DEFAULT FALSE,
    linked_article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type knowledge_source_type NOT NULL,
    source TEXT NOT NULL,
    status processing_status NOT NULL DEFAULT 'pending',
    ingested_content TEXT,
    ingestion_log JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding_status embedding_status NOT NULL DEFAULT 'pending',
    embedding VECTOR(1536), -- Default dimension for OpenAI embeddings
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_source_channels (
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    PRIMARY KEY (knowledge_source_id, channel_id)
);

CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_notification_date TIMESTAMPTZ,
    status recipient_status NOT NULL DEFAULT 'subscribed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_publish_date ON articles(publish_date);
CREATE INDEX IF NOT EXISTS idx_articles_channel_id ON articles(channel_id);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_categories ON articles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_posts_linked_article_id ON posts(linked_article_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_id ON knowledge_chunks(knowledge_source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks USING HNSW(embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_recipients_channel_id ON recipients(channel_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON recipients(status);
