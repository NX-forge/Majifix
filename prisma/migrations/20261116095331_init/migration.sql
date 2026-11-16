-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'TECHNICIAN', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "WaterPointType" AS ENUM ('BOREHOLE', 'HANDPUMP', 'MOTORISED_SYSTEM', 'SPRING', 'OTHER');

-- CreateEnum
CREATE TYPE "WaterPointStatus" AS ENUM ('OPERATIONAL', 'PARTIALLY_OPERATIONAL', 'NON_OPERATIONAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FaultCategory" AS ENUM ('MECHANICAL_FAILURE', 'PUMP_FAILURE', 'ELECTRICAL_FAILURE', 'PIPE_LEAKAGE', 'WATER_QUALITY_CONCERN', 'LOW_YIELD', 'OTHER');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL');

-- CreateEnum
CREATE TYPE "FaultStatus" AS ENUM ('REPORTED', 'UNDER_ASSESSMENT', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'REPAIR_COMPLETED', 'AWAITING_CONFIRMATION', 'RESTORED', 'REJECTED', 'CANCELLED', 'REOPENED');

-- CreateEnum
CREATE TYPE "ConfirmationResult" AS ENUM ('WATER_RESTORED', 'NOT_RESTORED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'COMMUNITY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterPoint" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WaterPointType" NOT NULL,
    "county" TEXT NOT NULL,
    "subCounty" TEXT,
    "community" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "peopleServed" INTEGER NOT NULL DEFAULT 0,
    "servesSchool" BOOLEAN NOT NULL DEFAULT false,
    "servesHealthFacility" BOOLEAN NOT NULL DEFAULT false,
    "alternativeWaterAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" "WaterPointStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skills" TEXT[],
    "serviceAreas" TEXT[],
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultReport" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "waterPointId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "category" "FaultCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "peopleAffected" INTEGER NOT NULL DEFAULT 0,
    "downtimeHours" INTEGER NOT NULL DEFAULT 0,
    "allServiceInterrupted" BOOLEAN NOT NULL DEFAULT false,
    "alternativeWaterAvailable" BOOLEAN NOT NULL DEFAULT true,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "status" "FaultStatus" NOT NULL DEFAULT 'REPORTED',
    "operatorOverrideReason" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaultReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairJob" (
    "id" TEXT NOT NULL,
    "faultReportId" TEXT NOT NULL,
    "technicianId" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "approvedCost" DECIMAL(12,2),
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "restoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairUpdate" (
    "id" TEXT NOT NULL,
    "faultReportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "FaultStatus" NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestorationConfirmation" (
    "id" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "result" "ConfirmationResult" NOT NULL,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestorationConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "WaterPoint_code_key" ON "WaterPoint"("code");

-- CreateIndex
CREATE INDEX "WaterPoint_county_status_idx" ON "WaterPoint"("county", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FaultReport_reference_key" ON "FaultReport"("reference");

-- CreateIndex
CREATE INDEX "FaultReport_status_priority_createdAt_idx" ON "FaultReport"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "FaultReport_waterPointId_createdAt_idx" ON "FaultReport"("waterPointId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_faultReportId_key" ON "RepairJob"("faultReportId");

-- CreateIndex
CREATE INDEX "RepairJob_technicianId_updatedAt_idx" ON "RepairJob"("technicianId", "updatedAt");

-- CreateIndex
CREATE INDEX "RepairUpdate_faultReportId_createdAt_idx" ON "RepairUpdate"("faultReportId", "createdAt");

-- CreateIndex
CREATE INDEX "RestorationConfirmation_repairJobId_confirmedAt_idx" ON "RestorationConfirmation"("repairJobId", "confirmedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterPoint" ADD CONSTRAINT "WaterPoint_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianProfile" ADD CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_waterPointId_fkey" FOREIGN KEY ("waterPointId") REFERENCES "WaterPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_faultReportId_fkey" FOREIGN KEY ("faultReportId") REFERENCES "FaultReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairUpdate" ADD CONSTRAINT "RepairUpdate_faultReportId_fkey" FOREIGN KEY ("faultReportId") REFERENCES "FaultReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairUpdate" ADD CONSTRAINT "RepairUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestorationConfirmation" ADD CONSTRAINT "RestorationConfirmation_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestorationConfirmation" ADD CONSTRAINT "RestorationConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
