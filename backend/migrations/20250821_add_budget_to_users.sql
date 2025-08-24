-- Add a budget column to users table (default 10000, change as needed)
ALTER TABLE users ADD COLUMN budget NUMERIC(12,2) DEFAULT 10000;
