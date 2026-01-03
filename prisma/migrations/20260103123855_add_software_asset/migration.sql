/*
  Warnings:

  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Asset` DROP FOREIGN KEY `Asset_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `AssetAssignment` DROP FOREIGN KEY `AssetAssignment_assetId_fkey`;

-- DropTable
DROP TABLE `Asset`;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vendor_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SoftwareAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('collaboration', 'devtool', 'designtool', 'infrastructure', 'security', 'other') NOT NULL,
    `status` ENUM('active', 'expiring', 'expired', 'terminated', 'on_hold') NOT NULL DEFAULT 'active',
    `expiryDate` DATETIME(3) NOT NULL,
    `ownerAdminId` INTEGER NOT NULL,
    `vendorId` INTEGER NULL,
    `departmentId` INTEGER NULL,
    `purchaseDate` DATETIME(3) NULL,
    `renewalCycle` ENUM('m1', 'm3', 'm6', 'y1', 'y3', 'one_time') NULL,
    `autoRenew` BOOLEAN NOT NULL DEFAULT false,
    `cost` DECIMAL(12, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KRW',
    `billingCycle` ENUM('monthly', 'yearly', 'one_time', 'none') NOT NULL DEFAULT 'monthly',
    `seatsTotal` INTEGER NULL,
    `seatsUsed` INTEGER NULL,
    `purchaseChannel` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SoftwareAsset_expiryDate_idx`(`expiryDate`),
    INDEX `SoftwareAsset_status_idx`(`status`),
    INDEX `SoftwareAsset_category_idx`(`category`),
    INDEX `SoftwareAsset_vendorId_idx`(`vendorId`),
    INDEX `SoftwareAsset_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Department_name_key` ON `Department`(`name`);

-- AddForeignKey
ALTER TABLE `SoftwareAsset` ADD CONSTRAINT `SoftwareAsset_ownerAdminId_fkey` FOREIGN KEY (`ownerAdminId`) REFERENCES `Admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SoftwareAsset` ADD CONSTRAINT `SoftwareAsset_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SoftwareAsset` ADD CONSTRAINT `SoftwareAsset_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAssignment` ADD CONSTRAINT `AssetAssignment_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `SoftwareAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
