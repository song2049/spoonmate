-- CreateTable
CREATE TABLE `AdminPermissionGrant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `permission` ENUM('ASSET_CSV_IMPORT', 'ASSET_TYPE_MANAGE', 'ADMIN_MANAGE') NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminPermissionGrant_adminId_idx`(`adminId`),
    UNIQUE INDEX `AdminPermissionGrant_adminId_permission_key`(`adminId`, `permission`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminPermissionGrant` ADD CONSTRAINT `AdminPermissionGrant_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
