-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'assigned', 'on_the_way', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "MechanicStatus" AS ENUM ('available', 'on_job', 'offline');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "zone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "MechanicStatus" NOT NULL DEFAULT 'available',
    "zone" TEXT NOT NULL,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "since" INTEGER NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mechanics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "mechanicId" TEXT,
    "serviceId" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_activities" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "mechanics_status_idx" ON "mechanics"("status");

-- CreateIndex
CREATE INDEX "mechanics_zone_idx" ON "mechanics"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_scheduledAt_idx" ON "bookings"("scheduledAt");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_mechanicId_idx" ON "bookings"("mechanicId");

-- CreateIndex
CREATE INDEX "booking_activities_bookingId_idx" ON "booking_activities"("bookingId");

-- CreateIndex
CREATE INDEX "booking_activities_createdAt_idx" ON "booking_activities"("createdAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_activities" ADD CONSTRAINT "booking_activities_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
