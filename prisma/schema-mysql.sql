-- Hostinger Business plan MySQL schema for Handblock Printing Cloth.
-- Run this ONCE on a fresh Hostinger MySQL database (hPanel -> Databases
-- -> phpMyAdmin, or mysql client). Do NOT run it over a live DB without
-- a backup — CREATE TABLE IF NOT EXISTS will not drop data, but it will
-- not migrate SQLite data either. See docs/MYSQL_MIGRATION.md.
-- MySQL equivalents of the SQLite tables in src/lib/db.ts:
-- TEXT -> TEXT, INTEGER -> INT, 0/1 flags -> TINYINT(1), dates -> VARCHAR(64)
-- (stored as ISO strings in SQLite; in MySQL use VARCHAR(64), and the
-- adapter converts ISO strings when reading/writing — see migration doc).
-- IDs are TEXT (cuid/uid strings), NOT auto-increment, so the app code
-- that generates ids in JS keeps working unchanged.

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY, slug VARCHAR(128) UNIQUE, name VARCHAR(255),
  parentId VARCHAR(64), description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY, slug VARCHAR(128) UNIQUE, name VARCHAR(255), type VARCHAR(32),
  categoryId VARCHAR(64), description TEXT, material VARCHAR(128), printTechnique VARCHAR(128),
  pattern VARCHAR(128), color VARCHAR(128), widthCm INT, gsm INT, pricePaise INT,
  minCm INT DEFAULT 50, maxCm INT DEFAULT 10000, incrementCm INT DEFAULT 50,
  tiersJson TEXT, image VARCHAR(512), washCare VARCHAR(255), origin VARCHAR(128),
  isActive TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS variants (
  id VARCHAR(64) PRIMARY KEY, productId VARCHAR(64), name VARCHAR(255),
  dimensions VARCHAR(255), includes TEXT, pricePaise INT, stock INT,
  INDEX idx_variants_product (productId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fabric_rolls (
  id VARCHAR(64) PRIMARY KEY, productId VARCHAR(64), rollCode VARCHAR(128), lot VARCHAR(128),
  originalCm INT, remainingCm INT, warehouse VARCHAR(128),
  INDEX idx_rolls_product (productId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(64) PRIMARY KEY, code VARCHAR(64) UNIQUE, percentOff INT DEFAULT 0,
  flatPaise INT DEFAULT 0, minSubtotalPaise INT DEFAULT 0, active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY, number VARCHAR(64) UNIQUE, userId VARCHAR(64),
  status VARCHAR(64), subtotalPaise INT, discountPaise INT, taxPaise INT, shippingPaise INT,
  totalPaise INT, paymentMethod VARCHAR(32), paymentStatus VARCHAR(64),
  addressJson TEXT, pincode VARCHAR(16), createdAt VARCHAR(64),
  providerOrderId VARCHAR(128), razorpayPaymentId VARCHAR(128),
  INDEX idx_orders_user (userId), INDEX idx_orders_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY, orderId VARCHAR(64), productId VARCHAR(64),
  nameSnapshot VARCHAR(255), sku VARCHAR(128), unitPricePaise INT, quantityCm INT,
  quantity INT DEFAULT 1, totalPaise INT, cutInstructions TEXT, rollId VARCHAR(64),
  INDEX idx_items_order (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY, productId VARCHAR(64), author VARCHAR(255),
  rating INT, body TEXT, verified TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wholesale_inquiries (
  id VARCHAR(64) PRIMARY KEY, businessName VARCHAR(255), contactName VARCHAR(255),
  email VARCHAR(255), gstin VARCHAR(64), message TEXT, createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscribers (
  id VARCHAR(64) PRIMARY KEY, email VARCHAR(255) UNIQUE, createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY, email VARCHAR(255) UNIQUE, passwordHash TEXT,
  name VARCHAR(255), role VARCHAR(32), createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(64) PRIMARY KEY, actor VARCHAR(255), action VARCHAR(128),
  detail TEXT, createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) PRIMARY KEY, userId VARCHAR(64), expiresAt VARCHAR(64), createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(64) PRIMARY KEY, userId VARCHAR(64), name VARCHAR(255), line1 TEXT,
  city VARCHAR(128), state VARCHAR(128), pincode VARCHAR(16), phone VARCHAR(32),
  isDefault TINYINT(1) DEFAULT 0,
  INDEX idx_addresses_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_verifications (
  token VARCHAR(128) PRIMARY KEY, userId VARCHAR(64), expiresAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  token VARCHAR(128) PRIMARY KEY, userId VARCHAR(64), expiresAt VARCHAR(64), used TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deletion_requests (
  id VARCHAR(64) PRIMARY KEY, userId VARCHAR(64), reason TEXT, createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_events (
  id VARCHAR(128) PRIMARY KEY, orderNumber VARCHAR(64), event VARCHAR(128),
  payloadJson TEXT, createdAt VARCHAR(64),
  INDEX idx_events_order (orderNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(64) PRIMARY KEY, orderId VARCHAR(64), orderNumber VARCHAR(64),
  amountPaise INT, reason TEXT, status VARCHAR(64), providerRefundId VARCHAR(128),
  razorpayPaymentId VARCHAR(128), error TEXT, createdAt VARCHAR(64), processedAt VARCHAR(64),
  INDEX idx_refunds_order (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(64) PRIMARY KEY, orderId VARCHAR(64), orderNumber VARCHAR(64) UNIQUE,
  bigshipOrderId VARCHAR(128), courierId VARCHAR(64), courierName VARCHAR(255),
  awb VARCHAR(128), referenceNumber VARCHAR(128), status VARCHAR(64),
  trackingJson TEXT, createdAt VARCHAR(64), updatedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS returns (
  id VARCHAR(64) PRIMARY KEY, orderId VARCHAR(64), orderNumber VARCHAR(64),
  userId VARCHAR(64), reason VARCHAR(64), detail TEXT, photoUrl VARCHAR(512),
  status VARCHAR(64), adminNote TEXT, refundIntentId VARCHAR(64),
  createdAt VARCHAR(64), updatedAt VARCHAR(64),
  INDEX idx_returns_order (orderNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR(64) PRIMARY KEY, toEmail VARCHAR(255), subject VARCHAR(255),
  provider VARCHAR(64), status VARCHAR(64), error TEXT, createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS verified_users (
  userId VARCHAR(64) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
