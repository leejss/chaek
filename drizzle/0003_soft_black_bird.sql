CREATE TABLE `content_builds` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`requested_by_user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`scope_type` text DEFAULT 'project' NOT NULL,
	`scope_node_id` text,
	`base_graph_version` integer NOT NULL,
	`result_graph_version` integer,
	`phase` text DEFAULT 'interpreting' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `content_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scope_node_id`) REFERENCES `content_nodes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "content_builds_base_graph_version_check" CHECK("content_builds"."base_graph_version" >= 0),
	CONSTRAINT "content_builds_result_graph_version_check" CHECK("content_builds"."result_graph_version" is null or "content_builds"."result_graph_version" >= 0),
	CONSTRAINT "content_builds_scope_type_check" CHECK("content_builds"."scope_type" in ('project', 'part', 'chapter', 'affected_subgraph')),
	CONSTRAINT "content_builds_phase_check" CHECK("content_builds"."phase" in ('interpreting', 'planning', 'validating', 'researching', 'drafting', 'reviewing', 'revising', 'finalizing')),
	CONSTRAINT "content_builds_status_check" CHECK("content_builds"."status" in ('queued', 'running', 'waiting_for_user', 'partially_completed', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_builds_project_idempotency_unique` ON `content_builds` (`project_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `content_builds_project_created_at_idx` ON `content_builds` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_builds_status_updated_at_idx` ON `content_builds` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `content_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`from_node_id` text NOT NULL,
	`to_node_id` text NOT NULL,
	`type` text NOT NULL,
	`metadata_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `content_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_node_id`) REFERENCES `content_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_node_id`) REFERENCES `content_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "content_edges_type_check" CHECK("content_edges"."type" in ('requires', 'introduces', 'uses', 'continues')),
	CONSTRAINT "content_edges_no_self_edge_check" CHECK("content_edges"."from_node_id" <> "content_edges"."to_node_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_edges_project_from_type_to_unique` ON `content_edges` (`project_id`,`from_node_id`,`type`,`to_node_id`);--> statement-breakpoint
CREATE INDEX `content_edges_project_from_type_idx` ON `content_edges` (`project_id`,`from_node_id`,`type`);--> statement-breakpoint
CREATE INDEX `content_edges_project_to_type_idx` ON `content_edges` (`project_id`,`to_node_id`,`type`);--> statement-breakpoint
CREATE TABLE `content_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`position` integer,
	`contract_json` text,
	`editorial_status` text DEFAULT 'planned' NOT NULL,
	`freshness` text DEFAULT 'fresh' NOT NULL,
	`stale_reason_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `content_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `content_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "content_nodes_kind_check" CHECK("content_nodes"."kind" in ('part', 'chapter', 'concept', 'example')),
	CONSTRAINT "content_nodes_editorial_status_check" CHECK("content_nodes"."editorial_status" in ('planned', 'approved', 'drafting', 'review', 'ready', 'published')),
	CONSTRAINT "content_nodes_freshness_check" CHECK("content_nodes"."freshness" in ('fresh', 'stale')),
	CONSTRAINT "content_nodes_position_check" CHECK("content_nodes"."position" is null or "content_nodes"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_nodes_project_slug_unique` ON `content_nodes` (`project_id`,`slug`);--> statement-breakpoint
CREATE INDEX `content_nodes_project_kind_idx` ON `content_nodes` (`project_id`,`kind`);--> statement-breakpoint
CREATE INDEX `content_nodes_project_parent_position_idx` ON `content_nodes` (`project_id`,`parent_id`,`position`);--> statement-breakpoint
CREATE INDEX `content_nodes_project_editorial_freshness_idx` ON `content_nodes` (`project_id`,`editorial_status`,`freshness`);--> statement-breakpoint
CREATE TABLE `content_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`creation_idempotency_key` text NOT NULL,
	`title` text NOT NULL,
	`seed_input` text NOT NULL,
	`brief_json` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`graph_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "content_projects_graph_version_check" CHECK("content_projects"."graph_version" >= 0),
	CONSTRAINT "content_projects_status_check" CHECK("content_projects"."status" in ('planning', 'drafting', 'review', 'ready', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_projects_user_creation_key_unique` ON `content_projects` (`user_id`,`creation_idempotency_key`);--> statement-breakpoint
CREATE INDEX `content_projects_user_updated_at_idx` ON `content_projects` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `content_projects_user_created_at_idx` ON `content_projects` (`user_id`,`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content_project_id` text,
	`content_build_id` text,
	`target_node_id` text,
	`idempotency_key` text NOT NULL,
	`task_type` text DEFAULT 'content_generation' NOT NULL,
	`payload_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`model` text DEFAULT 'gemini-3.6-flash' NOT NULL,
	`gemini_interaction_id` text,
	`input_json` text NOT NULL,
	`result_json` text,
	`usage_json` text,
	`base_graph_version` integer,
	`base_revision_id` text,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`result_disposition` text,
	`applied_at` integer,
	`error_stage` text,
	`error_code` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`submitted_at` integer,
	`finished_at` integer,
	`last_reconciled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_project_id`) REFERENCES `content_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`content_build_id`) REFERENCES `content_builds`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`target_node_id`) REFERENCES `content_nodes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "ai_jobs_payload_version_check" CHECK("__new_ai_jobs"."payload_version" >= 1),
	CONSTRAINT "ai_jobs_attempt_number_check" CHECK("__new_ai_jobs"."attempt_number" >= 1),
	CONSTRAINT "ai_jobs_base_graph_version_check" CHECK("__new_ai_jobs"."base_graph_version" is null or "__new_ai_jobs"."base_graph_version" >= 0),
	CONSTRAINT "ai_jobs_status_check" CHECK("__new_ai_jobs"."status" in ('queued', 'processing', 'requires_action', 'completed', 'failed', 'cancelled', 'incomplete')),
	CONSTRAINT "ai_jobs_error_stage_check" CHECK("__new_ai_jobs"."error_stage" is null or "__new_ai_jobs"."error_stage" in ('submission', 'execution', 'result_fetch', 'webhook', 'internal')),
	CONSTRAINT "ai_jobs_result_disposition_check" CHECK("__new_ai_jobs"."result_disposition" is null or "__new_ai_jobs"."result_disposition" in ('pending', 'applied', 'rejected', 'conflicted'))
);
--> statement-breakpoint
INSERT INTO `__new_ai_jobs`(
	"id",
	"user_id",
	"content_project_id",
	"content_build_id",
	"target_node_id",
	"idempotency_key",
	"task_type",
	"payload_version",
	"status",
	"model",
	"gemini_interaction_id",
	"input_json",
	"result_json",
	"usage_json",
	"base_graph_version",
	"base_revision_id",
	"attempt_number",
	"result_disposition",
	"applied_at",
	"error_stage",
	"error_code",
	"error_message",
	"created_at",
	"updated_at",
	"submitted_at",
	"finished_at",
	"last_reconciled_at"
)
SELECT
	"id",
	"user_id",
	NULL,
	NULL,
	NULL,
	"idempotency_key",
	"task_type",
	"payload_version",
	"status",
	"model",
	"gemini_interaction_id",
	"input_json",
	"result_json",
	"usage_json",
	NULL,
	NULL,
	1,
	NULL,
	NULL,
	"error_stage",
	"error_code",
	"error_message",
	"created_at",
	"updated_at",
	"submitted_at",
	"finished_at",
	"last_reconciled_at"
FROM `ai_jobs`;--> statement-breakpoint
DROP TABLE `ai_jobs`;--> statement-breakpoint
ALTER TABLE `__new_ai_jobs` RENAME TO `ai_jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_user_idempotency_unique` ON `ai_jobs` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_gemini_interaction_unique` ON `ai_jobs` (`gemini_interaction_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_user_created_at_idx` ON `ai_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_status_updated_at_idx` ON `ai_jobs` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_content_project_idx` ON `ai_jobs` (`content_project_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_content_build_idx` ON `ai_jobs` (`content_build_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_target_node_idx` ON `ai_jobs` (`target_node_id`);
