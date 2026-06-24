-- ============================================================
-- VQ Project - Schema completă a bazei de date
-- ============================================================
-- Conectare: psql -U app_user_vq -d vq_proiect -f schema.sql
-- ============================================================

-- Activează extensia UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. families
-- ============================================================
CREATE TABLE families (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'free'
        CHECK (subscription_type IN ('free', 'premium', 'enterprise'))
);

-- ============================================================
-- 2. parents
-- ============================================================
CREATE TABLE parents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parents_family_id ON parents(family_id);

-- ============================================================
-- 3. children
-- ============================================================
CREATE TABLE children (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    avatar          VARCHAR(500),
    birth_year      INTEGER NOT NULL,
    level           INTEGER NOT NULL DEFAULT 1
        CHECK (level >= 1),
    points          INTEGER NOT NULL DEFAULT 0
        CHECK (points >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_children_family_id ON children(family_id);

-- ============================================================
-- 4. activities
-- ============================================================
CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    points          INTEGER NOT NULL DEFAULT 0
        CHECK (points >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_activities_child_id ON activities(child_id);
CREATE INDEX idx_activities_status ON activities(status);

-- ============================================================
-- 5. rewards
-- ============================================================
CREATE TABLE rewards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    cost            INTEGER NOT NULL
        CHECK (cost > 0),
    type            VARCHAR(50) NOT NULL DEFAULT 'physical'
        CHECK (type IN ('physical', 'experience', 'privilege'))
);

CREATE INDEX idx_rewards_family_id ON rewards(family_id);

-- ============================================================
-- 6. transactions
-- ============================================================
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    points          INTEGER NOT NULL,
    reason          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_child_id ON transactions(child_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- ============================================================
-- 7. photos
-- ============================================================
CREATE TABLE photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id     UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    path            VARCHAR(1000) NOT NULL,
    validated       BOOLEAN NOT NULL DEFAULT FALSE,
    ai_feedback     TEXT
);

CREATE INDEX idx_photos_activity_id ON photos(activity_id);

-- ============================================================
-- 8. analytics_events
-- ============================================================
CREATE TABLE analytics_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id       UUID REFERENCES families(id) ON DELETE SET NULL,
    child_id        UUID REFERENCES children(id) ON DELETE SET NULL,
    event_name      VARCHAR(100) NOT NULL,
    properties      JSONB NOT NULL DEFAULT '{}',
    source          VARCHAR(50) NOT NULL DEFAULT 'web',
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_family ON analytics_events(family_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);

-- ============================================================
-- Acordă permisiuni utilizatorilor
-- ============================================================
-- Citește
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_user;

-- Scrie
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO write_user;

-- ============================================================
-- NOTĂ: Pentru a rula acest script:
-- psql -U app_user_vq -d vq_proiect -f /home/user/vq_project/schema.sql
-- ============================================================
