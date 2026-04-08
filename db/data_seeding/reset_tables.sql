-- Reset Phase 2 Tables for Testing
-- Drops only Phase 2 tables, keeps teammembers and other existing tables
-- Use this to test your demo multiple times

\echo 'Dropping Phase 2 tables...'

DROP TABLE IF EXISTS order_item_modification CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS customer_order CASCADE;
DROP TABLE IF EXISTS menu_item_inventory CASCADE;
DROP TABLE IF EXISTS modification_type CASCADE;
DROP TABLE IF EXISTS menu_item CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS employee CASCADE;

\echo 'Phase 2 tables dropped.'
\echo ''
\echo 'Remaining tables:'
\dt
\echo ''
\echo 'Ready to run create_schema.sql again!'
