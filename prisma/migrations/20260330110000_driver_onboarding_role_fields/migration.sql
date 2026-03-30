ALTER TABLE "profiles"
ADD COLUMN "active_address_id" UUID;

ALTER TABLE "providers"
ADD COLUMN "driver_type" "VehicleCategory";

CREATE INDEX "profiles_active_address_id_idx" ON "profiles"("active_address_id");

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_active_address_id_fkey"
FOREIGN KEY ("active_address_id") REFERENCES "user_addresses"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
