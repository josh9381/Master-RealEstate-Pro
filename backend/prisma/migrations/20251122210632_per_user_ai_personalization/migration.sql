/*
  Warnings:

  - You are about to drop the column `organizationId` on the `LeadScoringModel` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `LeadScoringModel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `LeadScoringModel` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."LeadScoringModel" DROP CONSTRAINT "LeadScoringModel_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."LeadScoringModel_organizationId_key";

-- AlterTable
ALTER TABLE "LeadScoringModel" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "UserAIPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatbotTone" TEXT NOT NULL DEFAULT 'professional',
    "autoSuggestActions" BOOLEAN NOT NULL DEFAULT true,
    "enableProactive" BOOLEAN NOT NULL DEFAULT true,
    "preferredContactTime" TEXT,
    "aiInsightsFrequency" TEXT NOT NULL DEFAULT 'daily',
    "customInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAIPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAIPreferences_userId_key" ON "UserAIPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadScoringModel_userId_key" ON "LeadScoringModel"("userId");

-- AddForeignKey
ALTER TABLE "LeadScoringModel" ADD CONSTRAINT "LeadScoringModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAIPreferences" ADD CONSTRAINT "UserAIPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
