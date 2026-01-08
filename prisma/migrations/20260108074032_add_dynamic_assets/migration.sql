-- CreateTable
CREATE TABLE `AssetType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AssetType_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetTypeField` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `typeId` INTEGER NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `fieldType` ENUM('text', 'textarea', 'number', 'date', 'select', 'boolean') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `optionsJson` JSON NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AssetTypeField_typeId_idx`(`typeId`),
    UNIQUE INDEX `AssetTypeField_typeId_key_key`(`typeId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetEntity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `typeId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `data` JSON NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssetEntity_typeId_idx`(`typeId`),
    INDEX `AssetEntity_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssetTypeField` ADD CONSTRAINT `AssetTypeField_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `AssetType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetEntity` ADD CONSTRAINT `AssetEntity_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `AssetType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetEntity` ADD CONSTRAINT `AssetEntity_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
