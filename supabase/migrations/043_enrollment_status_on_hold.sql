-- Purpose: add the administrative hold status; paused remains payment pending.
-- Application: not applied; application date: pending human review.
-- Run this file separately before 044.
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'active';
