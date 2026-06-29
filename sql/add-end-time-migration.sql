-- Migration: add end_time column to reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS end_time TIME;
