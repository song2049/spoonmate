-- CreateTable
CREATE TABLE `NotificationLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `rule` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `NotificationLog_assetId_rule_sentAt_key`(`assetId`, `rule`, `sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotificationLog` ADD CONSTRAINT `NotificationLog_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `SoftwareAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
