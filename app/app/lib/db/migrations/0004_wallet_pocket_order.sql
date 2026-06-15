ALTER TABLE "wallet_pockets" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
