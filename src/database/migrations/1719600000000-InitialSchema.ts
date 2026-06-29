import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for ECHO milestone one. Authored to match the entity
 * definitions exactly. Creates enums, tables, foreign keys, and the indexes
 * that back the primary access patterns (conversation message paging,
 * participant lookups, unique constraints).
 */
export class InitialSchema1719600000000 implements MigrationInterface {
  name = 'InitialSchema1719600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enums
    await queryRunner.query(
      `CREATE TYPE "last_seen_visibility" AS ENUM ('everyone','contacts','nobody')`,
    );
    await queryRunner.query(
      `CREATE TYPE "otp_channel" AS ENUM ('phone','email')`,
    );
    await queryRunner.query(
      `CREATE TYPE "otp_purpose" AS ENUM ('registration','password_reset','verification')`,
    );
    await queryRunner.query(
      `CREATE TYPE "conversation_type" AS ENUM ('direct','group')`,
    );
    await queryRunner.query(
      `CREATE TYPE "participant_role" AS ENUM ('member','admin','owner')`,
    );
    await queryRunner.query(
      `CREATE TYPE "message_type" AS ENUM ('text','image','video','audio','document','voice_note')`,
    );
    await queryRunner.query(
      `CREATE TYPE "message_status" AS ENUM ('sent','delivered','read')`,
    );

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "username" varchar(32) NOT NULL,
        "phoneNumber" varchar(20) NOT NULL,
        "email" varchar(255),
        "displayName" varchar(64) NOT NULL,
        "bio" varchar(280),
        "avatarUrl" varchar(512),
        "passwordHash" varchar(255) NOT NULL,
        "phoneVerified" boolean NOT NULL DEFAULT false,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "isOnline" boolean NOT NULL DEFAULT false,
        "lastSeenAt" timestamptz,
        "lastSeenVisibility" "last_seen_visibility" NOT NULL DEFAULT 'everyone',
        "readReceiptsEnabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username" ON "users" ("username")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_phone" ON "users" ("phoneNumber")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email") WHERE "email" IS NOT NULL`,
    );

    // refresh_tokens
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "deviceLabel" varchar(255),
        "expiresAt" timestamptz NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_refresh_tokens_hash" ON "refresh_tokens" ("tokenHash")`,
    );

    // otp_codes
    await queryRunner.query(`
      CREATE TABLE "otp_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "destination" varchar(255) NOT NULL,
        "channel" "otp_channel" NOT NULL,
        "purpose" "otp_purpose" NOT NULL,
        "codeHash" varchar(64) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "consumed" boolean NOT NULL DEFAULT false,
        "expiresAt" timestamptz NOT NULL,
        CONSTRAINT "PK_otp_codes" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_otp_dest_purpose" ON "otp_codes" ("destination","purpose")`,
    );

    // contacts
    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "ownerId" uuid NOT NULL,
        "contactUserId" uuid NOT NULL,
        "alias" varchar(64),
        "favorite" boolean NOT NULL DEFAULT false,
        "blocked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contacts_owner_contact" UNIQUE ("ownerId","contactUserId"),
        CONSTRAINT "FK_contacts_owner" FOREIGN KEY ("ownerId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contacts_contactUser" FOREIGN KEY ("contactUserId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_ownerId" ON "contacts" ("ownerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_contactUserId" ON "contacts" ("contactUserId")`,
    );

    // conversations
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "type" "conversation_type" NOT NULL DEFAULT 'direct',
        "title" varchar(128),
        "lastMessageAt" timestamptz,
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      )`);

    // conversation_participants
    await queryRunner.query(`
      CREATE TABLE "conversation_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "participant_role" NOT NULL DEFAULT 'member',
        "lastReadMessageId" uuid,
        "muted" boolean NOT NULL DEFAULT false,
        "leftAt" timestamptz,
        CONSTRAINT "PK_conversation_participants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_participant_conv_user" UNIQUE ("conversationId","userId"),
        CONSTRAINT "FK_participant_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_participant_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_participant_conversationId" ON "conversation_participants" ("conversationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_participant_userId" ON "conversation_participants" ("userId")`,
    );

    // messages
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "type" "message_type" NOT NULL DEFAULT 'text',
        "body" text,
        "mediaUrl" varchar(512),
        "replyToId" uuid,
        "status" "message_status" NOT NULL DEFAULT 'sent',
        "edited" boolean NOT NULL DEFAULT false,
        "deletedAt" timestamptz,
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("senderId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversationId" ON "messages" ("conversationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_senderId" ON "messages" ("senderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conv_created" ON "messages" ("conversationId","createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversation_participants"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP TABLE "otp_codes"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "message_status"`);
    await queryRunner.query(`DROP TYPE "message_type"`);
    await queryRunner.query(`DROP TYPE "participant_role"`);
    await queryRunner.query(`DROP TYPE "conversation_type"`);
    await queryRunner.query(`DROP TYPE "otp_purpose"`);
    await queryRunner.query(`DROP TYPE "otp_channel"`);
    await queryRunner.query(`DROP TYPE "last_seen_visibility"`);
  }
}
