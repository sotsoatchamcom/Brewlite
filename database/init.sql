-- ========================================================
-- DỰ ÁN: BREWLITE - HỆ THỐNG QUẢN LÝ QUÁN CÀ PHÊ
-- HỆ QUẢN TRỊ CSDL: MySQL 8.0+
-- TƯƠNG THÍCH HOÀN TOÀN VỚI: schema.prisma
-- ========================================================

CREATE DATABASE IF NOT EXISTS `brewlite`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `brewlite`;

-- Tạm thời tắt kiểm tra khóa ngoại để tạo mới sạch sẽ
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `Payment`;
DROP TABLE IF EXISTS `OrderItemTopping`;
DROP TABLE IF EXISTS `OrderItem`;
DROP TABLE IF EXISTS `Order`;
DROP TABLE IF EXISTS `Coupon`;
DROP TABLE IF EXISTS `Topping`;
DROP TABLE IF EXISTS `ProductSize`;
DROP TABLE IF EXISTS `Product`;
DROP TABLE IF EXISTS `Category`;
DROP TABLE IF EXISTS `User`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. BẢNG: User (Người dùng & Quản trị viên)
-- --------------------------------------------------------
CREATE TABLE `User` (
                        `id` INT AUTO_INCREMENT NOT NULL,
                        `email` VARCHAR(191) NOT NULL,
                        `passwordHash` VARCHAR(255) NOT NULL,
                        `name` VARCHAR(191) NULL,
                        `phone` VARCHAR(191) NULL,
                        `gender` VARCHAR(50) NULL,
                        `loyaltyPoints` INT NOT NULL DEFAULT 0,
                        `role` ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
                        `isActive` TINYINT(1) NOT NULL DEFAULT 1,
                        `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                        `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                        PRIMARY KEY (`id`),
                        UNIQUE KEY `User_email_key` (`email`),
                        UNIQUE KEY `User_phone_key` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. BẢNG: Category (Danh mục đồ uống)
-- --------------------------------------------------------
CREATE TABLE `Category` (
                            `id` INT AUTO_INCREMENT NOT NULL,
                            `name` VARCHAR(191) NOT NULL,
                            `description` TEXT NULL,
                            `imageUrl` VARCHAR(255) NULL,
                            `isActive` TINYINT(1) NOT NULL DEFAULT 1,
                            `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                            `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                            PRIMARY KEY (`id`),
                            UNIQUE KEY `Category_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. BẢNG: Product (Sản phẩm đồ uống)
-- --------------------------------------------------------
CREATE TABLE `Product` (
                           `id` INT AUTO_INCREMENT NOT NULL,
                           `name` VARCHAR(191) NOT NULL,
                           `price` INT NOT NULL,
                           `imageUrl` VARCHAR(255) NULL,
                           `description` TEXT NULL,
                           `stock` INT NOT NULL,
                           `version` INT NOT NULL DEFAULT 1,
                           `isActive` TINYINT(1) NOT NULL DEFAULT 1,
                           `categoryId` INT NULL,
                           `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                           `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                           PRIMARY KEY (`id`),
                           KEY `Product_categoryId_fkey` (`categoryId`),
                           CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. BẢNG: ProductSize (Kích cỡ đồ uống: S, M, L)
-- --------------------------------------------------------
CREATE TABLE `ProductSize` (
                               `id` INT AUTO_INCREMENT NOT NULL,
                               `name` VARCHAR(191) NOT NULL,
                               `surcharge` INT NOT NULL,
                               `isAvailable` TINYINT(1) NOT NULL DEFAULT 1,
                               `productId` INT NOT NULL,

                               PRIMARY KEY (`id`),
                               UNIQUE KEY `ProductSize_productId_name_key` (`productId`, `name`),
                               CONSTRAINT `ProductSize_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. BẢNG: Topping (Các loại topping chọn kèm)
-- --------------------------------------------------------
CREATE TABLE `Topping` (
                           `id` INT AUTO_INCREMENT NOT NULL,
                           `name` VARCHAR(191) NOT NULL,
                           `price` INT NOT NULL,
                           `imageUrl` VARCHAR(255) NULL,
                           `isAvailable` TINYINT(1) NOT NULL DEFAULT 1,
                           `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                           `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                           PRIMARY KEY (`id`),
                           UNIQUE KEY `Topping_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. BẢNG: Coupon (Mã giảm giá khuyến mãi)
-- --------------------------------------------------------
CREATE TABLE `Coupon` (
                          `id` INT AUTO_INCREMENT NOT NULL,
                          `code` VARCHAR(191) NOT NULL,
                          `type` ENUM('PERCENT', 'FIXED') NOT NULL,
                          `value` INT NOT NULL,
                          `minOrderValue` INT NOT NULL,
                          `maxDiscount` INT NULL,
                          `usageLimit` INT NULL,
                          `usedCount` INT NOT NULL DEFAULT 0,
                          `startsAt` DATETIME(3) NOT NULL,
                          `expiresAt` DATETIME(3) NOT NULL,
                          `isActive` TINYINT(1) NOT NULL DEFAULT 1,
                          `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                          `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                          PRIMARY KEY (`id`),
                          UNIQUE KEY `Coupon_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. BẢNG: Order (Đơn đặt hàng)
-- --------------------------------------------------------
CREATE TABLE `Order` (
                         `id` INT AUTO_INCREMENT NOT NULL,
                         `userId` INT NOT NULL,
                         `couponId` INT NULL,
                         `status` ENUM('PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                         `total` INT NOT NULL,
                         `discountCode` VARCHAR(191) NULL,
                         `discountAmount` INT NOT NULL DEFAULT 0,
                         `finalAmount` INT NOT NULL,
                         `loyaltyPointsEarned` INT NOT NULL DEFAULT 0,
                         `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                         `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                         PRIMARY KEY (`id`),
                         KEY `Order_userId_fkey` (`userId`),
                         KEY `Order_couponId_fkey` (`couponId`),
                         CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
                         CONSTRAINT `Order_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. BẢNG: OrderItem (Chi tiết từng món trong đơn)
-- --------------------------------------------------------
CREATE TABLE `OrderItem` (
                             `id` INT AUTO_INCREMENT NOT NULL,
                             `orderId` INT NOT NULL,
                             `productId` INT NOT NULL,
                             `productSizeId` INT NULL,
                             `productName` VARCHAR(191) NOT NULL,
                             `unitPrice` INT NOT NULL,
                             `sizeName` VARCHAR(191) NULL,
                             `sizeSurcharge` INT NOT NULL DEFAULT 0,
                             `qty` INT NOT NULL,
                             `lineTotal` INT NOT NULL,

                             PRIMARY KEY (`id`),
                             KEY `OrderItem_orderId_fkey` (`orderId`),
                             KEY `OrderItem_productId_fkey` (`productId`),
                             KEY `OrderItem_productSizeId_fkey` (`productSizeId`),
                             CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                             CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
                             CONSTRAINT `OrderItem_productSizeId_fkey` FOREIGN KEY (`productSizeId`) REFERENCES `ProductSize` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. BẢNG: OrderItemTopping (Topping đi kèm từng món nước)
-- --------------------------------------------------------
CREATE TABLE `OrderItemTopping` (
                                    `id` INT AUTO_INCREMENT NOT NULL,
                                    `orderItemId` INT NOT NULL,
                                    `toppingId` INT NOT NULL,
                                    `toppingName` VARCHAR(191) NOT NULL,
                                    `price` INT NOT NULL,
                                    `qty` INT NOT NULL DEFAULT 1,
                                    `lineTotal` INT NOT NULL,

                                    PRIMARY KEY (`id`),
                                    KEY `OrderItemTopping_orderItemId_fkey` (`orderItemId`),
                                    KEY `OrderItemTopping_toppingId_fkey` (`toppingId`),
                                    CONSTRAINT `OrderItemTopping_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                    CONSTRAINT `OrderItemTopping_toppingId_fkey` FOREIGN KEY (`toppingId`) REFERENCES `Topping` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. BẢNG: Payment (Lịch sử giao dịch thanh toán)
-- --------------------------------------------------------
CREATE TABLE `Payment` (
                           `id` INT AUTO_INCREMENT NOT NULL,
                           `orderId` INT NOT NULL,
                           `idempotencyKey` VARCHAR(191) NOT NULL,
                           `amount` INT NOT NULL,
                           `method` ENUM('WALLET', 'CARD') NOT NULL,
                           `status` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
                           `transactionId` VARCHAR(191) NULL,
                           `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                           `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                           PRIMARY KEY (`id`),
                           UNIQUE KEY `Payment_idempotencyKey_key` (`idempotencyKey`),
                           KEY `Payment_orderId_fkey` (`orderId`),
                           CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;