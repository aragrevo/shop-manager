CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `categories_store_id_idx` ON `categories` (`store_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customers_store_id_idx` ON `customers` (`store_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`category_id` text,
	`supplier` text,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`payment_method` text,
	`expense_date` integer DEFAULT (unixepoch()) NOT NULL,
	`notes` text,
	`receipt_url` text,
	`status` text DEFAULT 'paid' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expenses_store_id_idx` ON `expenses` (`store_id`);--> statement-breakpoint
CREATE INDEX `expenses_category_id_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_expense_date_idx` ON `expenses` (`expense_date`);--> statement-breakpoint
CREATE INDEX `expenses_status_idx` ON `expenses` (`status`);--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference_id` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inventory_movements_store_id_idx` ON `inventory_movements` (`store_id`);--> statement-breakpoint
CREATE INDEX `inventory_movements_product_id_idx` ON `inventory_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `inventory_movements_type_idx` ON `inventory_movements` (`type`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payment_methods_store_id_idx` ON `payment_methods` (`store_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`image_url` text,
	`sale_price` integer DEFAULT 0 NOT NULL,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`minimum_stock` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `products_store_id_idx` ON `products` (`store_id`);--> statement-breakpoint
CREATE INDEX `products_category_id_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_store_sku_idx` ON `products` (`store_id`,`sku`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_id_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_product_id_idx` ON `sale_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`customer_id` text,
	`total` integer DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`payment_method` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`sale_date` integer DEFAULT (unixepoch()) NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sales_store_id_idx` ON `sales` (`store_id`);--> statement-breakpoint
CREATE INDEX `sales_customer_id_idx` ON `sales` (`customer_id`);--> statement-breakpoint
CREATE INDEX `sales_sale_date_idx` ON `sales` (`sale_date`);--> statement-breakpoint
CREATE INDEX `sales_status_idx` ON `sales` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `store_members` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'employee' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_members_store_user_idx` ON `store_members` (`store_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `store_members_user_id_idx` ON `store_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`tax_id` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`timezone` text DEFAULT 'Europe/Madrid' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `stores_owner_id_idx` ON `stores` (`owner_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);