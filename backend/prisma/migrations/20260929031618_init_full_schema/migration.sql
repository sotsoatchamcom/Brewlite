-- AlterTable
ALTER TABLE `order` ADD COLUMN `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `discountCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;
