-- Migration: Add color field to tables
-- This migration adds a color column to the tables table for storing table-specific colors

ALTER TABLE public.tables 
ADD COLUMN color TEXT DEFAULT NULL;

-- Create an index on color for potential future optimizations
CREATE INDEX idx_tables_color ON public.tables(color) WHERE color IS NOT NULL;
