/*
  Warnings:

  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_dropoff_location_id_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_pickup_location_id_fkey";

-- DropTable
DROP TABLE "locations";

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" "State" NOT NULL,
    "postalCode" TEXT NOT NULL,
    "label" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "user_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_dropoff_location_id_fkey" FOREIGN KEY ("dropoff_location_id") REFERENCES "user_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
