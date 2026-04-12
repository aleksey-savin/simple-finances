ALTER TABLE "contract" ALTER COLUMN "amount" TYPE numeric[] USING ARRAY[amount];
