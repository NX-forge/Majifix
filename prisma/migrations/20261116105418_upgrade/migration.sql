-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RepairAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RepairCostApprovalStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RepairDelayReason" AS ENUM ('SPARE_PARTS_UNAVAILABLE', 'TRANSPORT', 'WEATHER', 'SITE_ACCESS', 'FUNDING', 'TECHNICAL_COMPLEXITY', 'OTHER');

-- AlterTable
ALTER TABLE "FaultReport" ADD COLUMN     "priorityFactors" JSONB;

-- AlterTable
ALTER TABLE "RepairJob" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "assignmentStatus" "RepairAssignmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "costApprovalReason" TEXT,
ADD COLUMN     "costApprovalStatus" "RepairCostApprovalStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "costReviewedById" TEXT,
ADD COLUMN     "declineReason" TEXT,
ADD COLUMN     "declinedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "WaterPointStatusChange" (
    "id" TEXT NOT NULL,
    "waterPointId" TEXT NOT NULL,
    "previousStatus" "WaterPointStatus" NOT NULL,
    "newStatus" "WaterPointStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterPointStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultSubmissionWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaultSubmissionWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultEvidence" (
    "id" TEXT NOT NULL,
    "faultReportId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairAssignmentHistory" (
    "id" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "notes" TEXT,
    "endReason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RepairAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairDelay" (
    "id" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" "RepairDelayReason" NOT NULL,
    "description" TEXT NOT NULL,
    "partName" TEXT,
    "quantity" INTEGER,
    "supplier" TEXT,
    "expectedResolutionAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairDelay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairEvidence" (
    "id" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaterPointStatusChange_waterPointId_createdAt_idx" ON "WaterPointStatusChange"("waterPointId", "createdAt");

-- CreateIndex
CREATE INDEX "WaterPointStatusChange_changedById_createdAt_idx" ON "WaterPointStatusChange"("changedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FaultSubmissionWindow_userId_key" ON "FaultSubmissionWindow"("userId");

-- CreateIndex
CREATE INDEX "FaultEvidence_faultReportId_createdAt_idx" ON "FaultEvidence"("faultReportId", "createdAt");

-- CreateIndex
CREATE INDEX "FaultEvidence_uploadedById_createdAt_idx" ON "FaultEvidence"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "RepairAssignmentHistory_repairJobId_assignedAt_idx" ON "RepairAssignmentHistory"("repairJobId", "assignedAt");

-- CreateIndex
CREATE INDEX "RepairAssignmentHistory_technicianId_assignedAt_idx" ON "RepairAssignmentHistory"("technicianId", "assignedAt");

-- CreateIndex
CREATE INDEX "RepairDelay_repairJobId_createdAt_idx" ON "RepairDelay"("repairJobId", "createdAt");

-- CreateIndex
CREATE INDEX "RepairDelay_resolvedAt_expectedResolutionAt_idx" ON "RepairDelay"("resolvedAt", "expectedResolutionAt");

-- CreateIndex
CREATE INDEX "RepairEvidence_repairJobId_createdAt_idx" ON "RepairEvidence"("repairJobId", "createdAt");

-- CreateIndex
CREATE INDEX "RepairEvidence_uploadedById_createdAt_idx" ON "RepairEvidence"("uploadedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- CreateIndex
CREATE INDEX "RepairJob_assignmentStatus_updatedAt_idx" ON "RepairJob"("assignmentStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "RepairJob_costApprovalStatus_updatedAt_idx" ON "RepairJob"("costApprovalStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "User_role_accountStatus_idx" ON "User"("role", "accountStatus");

-- CreateIndex
CREATE INDEX "User_accountStatus_createdAt_idx" ON "User"("accountStatus", "createdAt");

-- CreateIndex
CREATE INDEX "WaterPoint_operatorId_county_idx" ON "WaterPoint"("operatorId", "county");

-- CreateIndex
CREATE INDEX "WaterPoint_type_status_idx" ON "WaterPoint"("type", "status");

-- CreateIndex
CREATE INDEX "WaterPoint_createdAt_idx" ON "WaterPoint"("createdAt");

-- AddForeignKey
ALTER TABLE "WaterPointStatusChange" ADD CONSTRAINT "WaterPointStatusChange_waterPointId_fkey" FOREIGN KEY ("waterPointId") REFERENCES "WaterPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterPointStatusChange" ADD CONSTRAINT "WaterPointStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultSubmissionWindow" ADD CONSTRAINT "FaultSubmissionWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultEvidence" ADD CONSTRAINT "FaultEvidence_faultReportId_fkey" FOREIGN KEY ("faultReportId") REFERENCES "FaultReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultEvidence" ADD CONSTRAINT "FaultEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_costReviewedById_fkey" FOREIGN KEY ("costReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairAssignmentHistory" ADD CONSTRAINT "RepairAssignmentHistory_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairDelay" ADD CONSTRAINT "RepairDelay_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairDelay" ADD CONSTRAINT "RepairDelay_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEvidence" ADD CONSTRAINT "RepairEvidence_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEvidence" ADD CONSTRAINT "RepairEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
