# UI / UX Product Requirements

## Visual direction

Create a polished AI discovery platform, not a generic dashboard.

Visual language:

- modern;
- premium but restrained;
- technology-oriented;
- high contrast;
- generous spacing;
- excellent typography;
- subtle gradients;
- subtle borders;
- restrained shadows;
- clean cards;
- strong hierarchy.

Avoid:

- excessive glassmorphism;
- excessive neon;
- giant animated backgrounds;
- excessive rounded containers;
- dashboard-like visual density;
- template-looking UI.

## Global shell

Header:

```text
[Logo]    [Discover] [AI News] [Rankings]       [Search] [Account]
```

Desktop:
- sticky or top header;
- max-width content container;
- active tab clearly visible.

Mobile:
- responsive navigation;
- no horizontal overflow;
- account menu remains accessible.

## Page 1 — Discover

### Hero

Include:

- headline;
- supporting slogan;
- short explanation;
- primary CTA;
- secondary CTA;
- decorative AI-themed visual treatment.

Example positioning:

```text
Discover better ways to work with AI.

Curated prompts, workflows and skills
for real-world work — organized by what you actually do.

[Explore skills] [Browse AI tools]
```

Do not hard-code this exact copy if product branding changes later.

### Featured skill section

Show:

- section heading;
- filters;
- cards.

Each skill card:

```text
[FREE / PRO]
[Category]
Title
Short description

Industry: Marketing
Use case: Video generation
Tools: Sora / Runway / etc.

★★★★★  4.8
1.2k saves
```

Only show fields that exist.

### Filters

MVP:

- search;
- industry;
- category;
- free/paid;
- AI tool.

Use URL search parameters for shareable filtering.

Example:

```text
/?q=video&industry=marketing&access=FREE
```

## Page 2 — AI News

Layout:

```text
AI News
Latest developments in tools, models and technology.

[Featured article]

[Article card] [Article card] [Article card]
[Article card] [Article card] [Article card]
```

Article fields:

- title;
- excerpt;
- cover image;
- source;
- published date;
- category;
- AI tools mentioned;
- reading time.

Article detail:

- semantic article markup;
- title;
- source attribution;
- publication date;
- body;
- related articles.

## Page 3 — Rankings

Heading:

```text
AI Tools Rankings
```

Controls:

- industry;
- use case/category;
- period;
- region if later required.

Ranking row:

```text
#1
Logo
Tool name
Short description
Category
Popularity metrics
```

Do not use hard-coded ordinal values.

The backend must determine ranking order.

## Account

Authenticated user menu:

```text
Avatar
Name
Email

Saved skills
Profile
Sign out
```

Unauthenticated state:

```text
Sign in with Google
```

## Accessibility

Must support:

- keyboard navigation;
- visible focus states;
- semantic headings;
- buttons for actions;
- links for navigation;
- accessible labels for icons;
- sufficient contrast;
- reduced-motion-friendly behavior.

Do not use clickable `<div>` elements where a button or link is appropriate.

## Responsive breakpoints

Design mobile-first.

Verify at:

- 360px;
- 390px;
- 768px;
- 1024px;
- 1280px;
- 1440px+.

## SEO

Public pages must have:

- title;
- description;
- canonical URL strategy;
- Open Graph metadata where practical;
- semantic headings.

Dynamic skill and article pages must generate metadata from content.

## Performance

- Prefer Server Components.
- Optimize images.
- Avoid loading large client-only libraries on initial page load.
- Avoid unnecessary client state.
- Paginate large datasets.
- Do not fetch all news/skills/rankings and filter them in the browser.

## Empty states

Every data-driven page needs:

- loading state where applicable;
- empty state;
- error state;
- populated state.

Examples:

```text
No skills found.
Try another keyword or remove a filter.
```
