ALTER TABLE "stores" DROP CONSTRAINT "stores_subdomain_unique";--> statement-breakpoint
ALTER TABLE "stores" DROP CONSTRAINT "stores_custom_domain_unique";--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "stores_subdomain_active_unique" ON "stores" USING btree ("subdomain") WHERE "stores"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stores_custom_domain_active_unique" ON "stores" USING btree ("custom_domain") WHERE "stores"."deleted_at" IS NULL AND "stores"."custom_domain" IS NOT NULL;