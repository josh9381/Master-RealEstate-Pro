-- CreateTable
CREATE TABLE "APIKeyAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIKeyAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "APIKeyAudit_userId_createdAt_idx" ON "APIKeyAudit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "APIKeyAudit_provider_idx" ON "APIKeyAudit"("provider");

-- AddForeignKey
ALTER TABLE "APIKeyAudit" ADD CONSTRAINT "APIKeyAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
