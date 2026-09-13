CREATE TABLE `accessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spaceId` int NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`ipHash` varchar(128),
	`userAgentSummary` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`thumbnailKey` varchar(512),
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`width` int,
	`height` int,
	`checksum` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spaceId` int NOT NULL,
	`entryId` int,
	`nickname` varchar(80) NOT NULL,
	`content` text NOT NULL,
	`replyToCommentId` int,
	`status` enum('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spaceId` int NOT NULL,
	`authorId` int,
	`entryType` enum('text','image','system') NOT NULL,
	`textContent` text,
	`replyToEntryId` int,
	`visibility` enum('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spaceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spaceId` int NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`entityId` int,
	`payloadJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spaceEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`shareTokenHash` varchar(128) NOT NULL,
	`passwordHash` varchar(255),
	`allowComments` int NOT NULL DEFAULT 1,
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`lastActivityAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `spaces_token_hash_idx` UNIQUE(`shareTokenHash`)
);
--> statement-breakpoint
CREATE INDEX `access_logs_space_created_idx` ON `accessLogs` (`spaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attachments_entry_idx` ON `attachments` (`entryId`);--> statement-breakpoint
CREATE INDEX `attachments_checksum_idx` ON `attachments` (`checksum`);--> statement-breakpoint
CREATE INDEX `comments_space_created_idx` ON `comments` (`spaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `entries_space_created_idx` ON `entries` (`spaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `space_events_space_id_idx` ON `spaceEvents` (`spaceId`,`id`);--> statement-breakpoint
CREATE INDEX `spaces_owner_idx` ON `spaces` (`ownerId`);