CREATE TABLE `activityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`actorName` varchar(180) NOT NULL,
	`action` varchar(40) NOT NULL,
	`entityType` varchar(40) NOT NULL,
	`entityId` varchar(80) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`avatarUrl` varchar(500),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdById` int NOT NULL,
	`updatedById` int NOT NULL,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenseShares` (
	`expenseId` int NOT NULL,
	`employeeId` int NOT NULL,
	`amountMinor` int NOT NULL,
	CONSTRAINT `expenseShares_expenseId_employeeId_pk` PRIMARY KEY(`expenseId`,`employeeId`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`amountMinor` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`paidById` int NOT NULL,
	`occurredAt` datetime NOT NULL,
	`notes` text,
	`version` int NOT NULL DEFAULT 1,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdById` int NOT NULL,
	`updatedById` int NOT NULL,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payerId` int NOT NULL,
	`payeeId` int NOT NULL,
	`amountMinor` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`paidAt` datetime NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdById` int NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activity_log_created_at_idx` ON `activityLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `employees_active_name_idx` ON `employees` (`active`,`name`);--> statement-breakpoint
CREATE INDEX `expenses_occurred_at_idx` ON `expenses` (`occurredAt`);--> statement-breakpoint
CREATE INDEX `payments_paid_at_idx` ON `payments` (`paidAt`);