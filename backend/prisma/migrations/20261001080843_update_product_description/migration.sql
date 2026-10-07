/*
  Warnings:

  - You are about to drop the column `detailDescription` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `product` table. All the data in the column will be lost.
  - You are about to drop the `ingredient` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `product` DROP COLUMN `detailDescription`,
    DROP COLUMN `shortDescription`,
    ADD COLUMN `description` TEXT NULL;

-- DropTable
DROP TABLE `ingredient`;
