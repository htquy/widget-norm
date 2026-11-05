# PostgreSQL Database Design — Code First

## ORM

Use Prisma ORM as the code-first database layer.

The source of truth is:

```text
prisma/schema.prisma
```

Database changes must be made through Prisma migrations.

Do not manually maintain production SQL as the primary schema definition.

Typical workflow:

```bash
npx prisma validate
npx prisma migrate dev --name init
npx prisma generate
```

For deployment:

```bash
npx prisma migrate deploy
```

## Design principles

- PostgreSQL Multi-Schema: Partitioned into `authentication`, `catalog`, `payment`, `apps`, and `audit`.
- UUID primary keys for application entities.
- Use `timestamptz` semantics through Prisma `DateTime`.
- Add `createdAt` and `updatedAt` where useful.
- Use unique slugs for public URLs.
- Use join tables for many-to-many relationships.
- Add indexes according to real query patterns.
- Keep content and taxonomy normalized.
- Do not store comma-separated IDs.
- Modular isolation: No direct cross-schema joins in application code to enable zero-downtime microservice decomposition.

## Schemas & Entities

```text
Schema [authentication]:
- User
- Account
- Session
- VerificationToken
- OAuthClient (Enterprise SSO client registration)
- AuthorizationCode (PKCE RFC 7636)
- OAuthAccessToken (Secure hashed access tokens)
- OAuthRefreshToken (Rotating refresh tokens)

Schema [apps]:
- App (Web App, Windows Tool, Mobile App, Embed Widget, MCP Server)
- AppMenuItem (Dynamic menus, FREE / PAID access control)
- Feature (Feature flags / permission keys)
- SubscriptionPlan (Monthly, Quarterly, Yearly, Lifetime plans)
- PlanFeature (Mapping features to subscription tiers)
- UserSubscription (User subscription records with expiry dates)

Schema [catalog]:
- Skill, SkillVersion, SkillPrice
- Tool, ToolPrice, ToolVersion
- SkillCategory, Industry, UseCase, AITool
- SkillCategoryLink, SkillIndustryLink, SkillUseCaseLink, SkillToolLink
- NewsArticle, NewsCategory, NewsToolLink
- Ranking, RankingEntry
- SkillFavorite, SkillView, ToolClick

Schema [payment]:
- Order
- PaymentTransaction
- WebhookEvent
- SkillAccess

Schema [audit]:
- AuditLog
```

## Identity

Auth.js normally needs:

```text
User
Account
Session
VerificationToken
```

Use the adapter schema required by the selected Auth.js/Prisma integration version.

Do not invent a custom OAuth implementation when Auth.js already provides the integration.

## User

Suggested fields:

```text
id UUID PK
name VARCHAR(120) nullable
email VARCHAR(320) unique nullable
emailVerified TIMESTAMPTZ nullable
image TEXT nullable
createdAt TIMESTAMPTZ
updatedAt TIMESTAMPTZ
```

Additional application-level fields may be added:

```text
role USER | ADMIN
status ACTIVE | SUSPENDED
```

Do not use database-level role names that conflict with PostgreSQL roles.

## Skill

Represents a published reusable AI prompt/skill/workflow.

Suggested fields:

```text
id UUID PK
slug VARCHAR(180) unique
title VARCHAR(200)
shortDescription VARCHAR(500)
description TEXT
accessType FREE | PAID
status DRAFT | PUBLISHED | ARCHIVED
authorId UUID nullable
coverImageUrl TEXT nullable
viewCount BIGINT default 0
favoriteCount BIGINT default 0
ratingAverage DECIMAL(3,2) nullable
ratingCount INTEGER default 0
publishedAt TIMESTAMPTZ nullable
createdAt TIMESTAMPTZ
updatedAt TIMESTAMPTZ
```

## SkillVersion

Keep prompt content versioned.

Suggested:

```text
id UUID PK
skillId UUID FK
version INTEGER
content TEXT
instructions TEXT nullable
variables JSONB nullable
changelog TEXT nullable
createdAt TIMESTAMPTZ
```

Unique:

```text
(skillId, version)
```

The published Skill points conceptually to the active version.

This allows future editing without destroying historical content.

## SkillPrice

Do not bake price into `Skill`.

Suggested:

```text
id UUID PK
skillId UUID FK
currency CHAR(3)
amount INTEGER
isActive BOOLEAN
createdAt TIMESTAMPTZ
```

Store money in the smallest currency unit.

Example:

```text
1000 = 10.00 USD
```

If commerce is not implemented yet, this table can remain unused.

## Taxonomy

### Industry

```text
id UUID PK
slug unique
name
description nullable
```

Examples:

```text
marketing
software-development
education
design
sales
hr
finance
research
content-creation
```

### Category

```text
id UUID PK
slug unique
name
description nullable
```

Examples:

```text
video-generation
image-generation
writing
coding
research
automation
presentation
data-analysis
```

### UseCase

```text
id UUID PK
slug unique
name
description nullable
```

Examples:

```text
youtube-video
social-media-content
ad-copy
code-review
meeting-summary
```

### AITool

```text
id UUID PK
slug unique
name
description nullable
websiteUrl nullable
logoUrl nullable
status ACTIVE | INACTIVE
createdAt
updatedAt
```

Examples:

```text
ChatGPT
Claude
Gemini
Midjourney
Runway
Sora
Cursor
```

Do not assume these are the final product list; they are seed examples only.

## Skill relationships

Many-to-many:

```text
SkillCategoryLink
SkillIndustryLink
SkillUseCaseLink
SkillToolLink
```

Each should use a composite unique constraint:

```text
(skillId, categoryId)
(skillId, industryId)
(skillId, useCaseId)
(skillId, toolId)
```

## News

### NewsArticle

```text
id UUID PK
slug unique
title
excerpt nullable
content TEXT
coverImageUrl nullable
sourceName
sourceUrl
status DRAFT | PUBLISHED | ARCHIVED
publishedAt nullable
createdAt
updatedAt
```

### NewsCategory

```text
id UUID PK
slug unique
name
```

### NewsToolLink

```text
articleId
toolId
```

## Rankings

Do not persist `rank = 1, 2, 3` as the only source of truth.

The system should support calculating rankings from metrics.

### Ranking

```text
id UUID PK
name
slug unique
industryId nullable
categoryId nullable
periodType WEEK | MONTH | QUARTER | ALL_TIME
periodStart nullable
periodEnd nullable
status DRAFT | PUBLISHED
createdAt
updatedAt
```

### RankingEntry

```text
id UUID PK
rankingId FK
toolId FK
score DECIMAL(12,4)
views BIGINT
favorites BIGINT
clicks BIGINT
rank INTEGER
```

`rank` can be materialized for a published snapshot, but the score and metrics remain the data basis.

Unique:

```text
(rankingId, toolId)
```

## Engagement

### SkillFavorite

```text
userId
skillId
createdAt
```

Unique:

```text
(userId, skillId)
```

### SkillView

For MVP, this can be anonymous or authenticated.

Suggested:

```text
id UUID PK
skillId FK
userId UUID nullable
sessionHash VARCHAR(...) nullable
createdAt
```

Do not store raw IP addresses unless there is a concrete privacy/legal requirement and policy for doing so.

### ToolClick

```text
id UUID PK
toolId FK
userId UUID nullable
source VARCHAR(80)
createdAt
```

## Index strategy

Initial indexes:

```text
Skill.slug
Skill.status + publishedAt
Skill.accessType
Skill.createdAt
Skill.favoriteCount
SkillIndustryLink.industryId + skillId
SkillCategoryLink.categoryId + skillId
SkillUseCaseLink.useCaseId + skillId
SkillToolLink.toolId + skillId

NewsArticle.slug
NewsArticle.status + publishedAt
NewsArticle.sourceName

Ranking.slug
Ranking.status
RankingEntry.rankingId + rank
RankingEntry.toolId
```

Do not blindly index every column.

## Recommended Prisma enums

```text
UserRole
UserStatus
SkillAccessType
ContentStatus
AIToolStatus
RankingPeriodType
```

## JSONB usage

JSONB is acceptable for:

- prompt variables;
- flexible prompt configuration;
- future tool-specific metadata.

Do not use JSONB for core relational fields such as industry, category or tool IDs.

## Example Prisma model outline

This is an architectural starting point, not a copy/paste replacement for the exact Auth.js adapter version:

```prisma
enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

enum SkillAccessType {
  FREE
  PAID
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum AIToolStatus {
  ACTIVE
  INACTIVE
}

enum RankingPeriodType {
  WEEK
  MONTH
  QUARTER
  ALL_TIME
}

model Skill {
  id              String          @id @default(uuid())
  slug            String          @unique
  title           String
  shortDescription String         @db.VarChar(500)
  description     String
  accessType      SkillAccessType
  status          ContentStatus   @default(DRAFT)
  authorId        String?
  coverImageUrl   String?
  viewCount       BigInt          @default(0)
  favoriteCount   BigInt          @default(0)
  ratingAverage   Decimal?        @db.Decimal(3, 2)
  ratingCount     Int             @default(0)
  publishedAt     DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  versions        SkillVersion[]
  prices          SkillPrice[]
  categories      SkillCategoryLink[]
  industries      SkillIndustryLink[]
  useCases        SkillUseCaseLink[]
  tools           SkillToolLink[]
  favorites       SkillFavorite[]
  views           SkillView[]

  @@index([status, publishedAt])
  @@index([accessType])
  @@index([favoriteCount])
}

model SkillVersion {
  id           String   @id @default(uuid())
  skillId      String
  version      Int
  content      String
  instructions String?
  variables    Json?
  changelog    String?
  createdAt    DateTime @default(now())

  skill Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([skillId, version])
}
```

Complete the remaining models based on the same principles and the Auth.js adapter documentation for the exact installed version.

## Seed data

Seed:

- 5–10 industries;
- 8–12 categories;
- 10–20 use cases;
- 10–20 AI tools;
- 12–24 skills;
- 8–15 news articles;
- 3–5 ranking snapshots.

Seed data should be realistic enough to make the UI look complete.

Do not use copyrighted article bodies from real publishers as seed data. Use original summaries/placeholders.
