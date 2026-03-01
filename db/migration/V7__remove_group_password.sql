-- V7: Remove password_hash column from groups table (passwords replaced by OTP + invite links)

ALTER TABLE groups DROP COLUMN IF EXISTS password_hash;
