-- Migration: Add customer_email to reservations
-- Run this in your Supabase SQL Editor

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS customer_email TEXT;
