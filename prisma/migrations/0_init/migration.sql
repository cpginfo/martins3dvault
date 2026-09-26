-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Library" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastScanAt" TIMESTAMP(3),
    "scanStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "folderPath" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "collectionId" TEXT,
    "description" TEXT,
    "author" TEXT,
    "license" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isPrinted" BOOLEAN NOT NULL DEFAULT false,
    "printedAt" TIMESTAMP(3),
    "coverImage" TEXT,
    "filamentType" TEXT,
    "nozzleSize" DOUBLE PRECISION,
    "infillDensity" INTEGER,
    "layerHeight" DOUBLE PRECISION,
    "printTimeMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelFile" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileHash" TEXT,
    "format" TEXT NOT NULL,
    "mimeType" TEXT,
    "dimensionsX" DOUBLE PRECISION,
    "dimensionsY" DOUBLE PRECISION,
    "dimensionsZ" DOUBLE PRECISION,
    "triangleCount" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isPrinted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAsset" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanJob" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "addedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterSettings" (
    "id" TEXT NOT NULL,
    "printerName" TEXT NOT NULL DEFAULT 'Impressora 3D Principal',
    "printerCost" DOUBLE PRECISION NOT NULL DEFAULT 2500.0,
    "powerWatts" DOUBLE PRECISION NOT NULL DEFAULT 250.0,
    "lifespanHours" DOUBLE PRECISION NOT NULL DEFAULT 3000.0,
    "electricityKwhCost" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "manualHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 35.0,
    "defaultMarkup" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costPerKg" DOUBLE PRECISION NOT NULL,
    "density" DOUBLE PRECISION DEFAULT 1.24,
    "color" TEXT,
    "brand" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintBudget" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT,
    "printTimeMinutes" INTEGER NOT NULL,
    "weightGrams" DOUBLE PRECISION NOT NULL,
    "materialId" TEXT,
    "materialName" TEXT NOT NULL,
    "materialCostPerKg" DOUBLE PRECISION NOT NULL,
    "modelingTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "assemblyTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "powerWatts" DOUBLE PRECISION NOT NULL,
    "electricityKwhCost" DOUBLE PRECISION NOT NULL,
    "printerCost" DOUBLE PRECISION NOT NULL,
    "lifespanHours" DOUBLE PRECISION NOT NULL,
    "manualHourlyRate" DOUBLE PRECISION NOT NULL,
    "energyCost" DOUBLE PRECISION NOT NULL,
    "depreciationCost" DOUBLE PRECISION NOT NULL,
    "materialCost" DOUBLE PRECISION NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "accessoriesCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "suggestedPrice" DOUBLE PRECISION NOT NULL,
    "simulatedProfit" DOUBLE PRECISION NOT NULL,
    "isSale" BOOLEAN NOT NULL DEFAULT false,
    "finalPrice" DOUBLE PRECISION,
    "actualProfit" DOUBLE PRECISION,
    "priceDifference" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintBudgetAccessory" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintBudgetAccessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ModelToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ModelToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Library_path_key" ON "Library"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_parentId_idx" ON "Collection"("parentId");

-- CreateIndex
CREATE INDEX "Model_name_idx" ON "Model"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Model_libraryId_folderPath_key" ON "Model"("libraryId", "folderPath");

-- CreateIndex
CREATE INDEX "ModelFile_modelId_idx" ON "ModelFile"("modelId");

-- CreateIndex
CREATE INDEX "ModelAsset_modelId_idx" ON "ModelAsset"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ScanJob_libraryId_idx" ON "ScanJob"("libraryId");

-- CreateIndex
CREATE INDEX "PrintMaterial_name_idx" ON "PrintMaterial"("name");

-- CreateIndex
CREATE INDEX "PrintBudget_productName_idx" ON "PrintBudget"("productName");

-- CreateIndex
CREATE INDEX "PrintBudget_customerName_idx" ON "PrintBudget"("customerName");

-- CreateIndex
CREATE INDEX "PrintBudget_isSale_idx" ON "PrintBudget"("isSale");

-- CreateIndex
CREATE INDEX "PrintBudget_createdAt_idx" ON "PrintBudget"("createdAt");

-- CreateIndex
CREATE INDEX "PrintBudgetAccessory_budgetId_idx" ON "PrintBudgetAccessory"("budgetId");

-- CreateIndex
CREATE INDEX "_ModelToTag_B_index" ON "_ModelToTag"("B");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelFile" ADD CONSTRAINT "ModelFile_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAsset" ADD CONSTRAINT "ModelAsset_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintBudget" ADD CONSTRAINT "PrintBudget_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "PrintMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintBudgetAccessory" ADD CONSTRAINT "PrintBudgetAccessory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "PrintBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModelToTag" ADD CONSTRAINT "_ModelToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModelToTag" ADD CONSTRAINT "_ModelToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

