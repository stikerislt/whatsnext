# Design System — HTML Prototype → shadcn/ui Mapping

Source: [`whatsnext_v4-2_Pilnas apps.html`](../whatsnext_v4-2_Pilnas%20apps.html) (canonical tokens)

## Brand Tokens

| Token | CSS Variable | Value | Tailwind |
|-------|--------------|-------|----------|
| Background | `--bg` | `#FBFCFC` | `bg-background` |
| Surface | `--bg2` | `#FFFFFF` | `bg-card` |
| Muted surface | `--bg3` | `#F5F5F3` | `bg-muted` |
| Primary ink | `--text` | `#10182B` | `text-foreground` |
| Body text | `--text2` | `#3B3B3B` | `text-muted-foreground` |
| Brand orange | `--v` | `#FF751F` | `bg-primary` |
| Success | `--g` | `#16A34A` | semantic green |
| Warning | `--a` | `#D97706` | semantic amber |
| Danger | `--r` | `#DC2626` | `destructive` |
| Info | `--b` | `#2563EB` | semantic blue |

**Fonts:** Poppins (UI + display), JetBrains Mono (metrics/dates)

## Layout Shell

| Prototype | React Component | Path |
|-----------|-----------------|------|
| `.shell` | `AppShell` | `components/layout/app-shell.tsx` |
| `.sidebar` | `Sidebar` | `components/layout/sidebar.tsx` |
| `.topbar` | `Topbar` | `components/layout/topbar.tsx` |
| `.role-sw` / `.rtab` | `RoleSwitcher` | `components/layout/role-switcher.tsx` |
| `.view` | `ViewContainer` | per-route page wrapper |

## View → Route Mapping

| Nav ID | Page Title | Route | Key Components |
|--------|------------|-------|----------------|
| home | Command Center | `/` | `HomeBanner`, `MetricStrip`, `GoalThread`, `WorkAlignment`, `PeopleCapacity`, `BlockingDecisions`, `WorkTypeSplit`, `AiPanel` |
| decisions | Decision Center | `/decisions` | `DecisionCard`, `AiPanel` |
| signals | Live Signals | `/signals` | `SignalList`, `SignalSummary`, `AiPanel` |
| strategy | Strategy Map | `/strategy` | `AlignmentMetrics`, `ProjectTimeline`, `GoalRow`, `UnlinkedProjects` |
| projects | Projects | `/projects` | `ProjectGrid`, `ProjectCard`, filter tabs |
| analytics | Execution Analytics | `/analytics` | `AnalyticsMetrics`, `WorkTypeChart`, `GoalTrendChart` |
| marketplace | Talent Marketplace | `/marketplace` | `TalentCard`, `HelpRequest`, `AiMatchSuggestions` |
| talent | Talent Database | `/talent` | `TalentSearch`, `SkillFilters`, `PersonCard` |
| skills | Skills & Growth | `/skills` | `SkillDepthChart`, `SkillGaps`, `UpskillList` |
| bonuses | Bonuses & Motivation | `/bonuses` | `BonusMetrics`, `CriteriaList`, `PayoutPreview` |
| integrations | Integrations | `/integrations` | `IntegrationCard`, `DataLayerViz` |
| layers | System Layers | `/layers` | `LayerCard`, `DataFlow` |
| myview | My Dashboard | `/my` | role-specific `MyDashboard` variants |
| fullai | AI Advisor | `/ai` | `FullAiChat`, `QuickPrompts` |

## Component Mapping

| Prototype Class | shadcn Base | Custom Wrapper |
|-----------------|-------------|----------------|
| `.card` | `Card` | `WnCard` (14px radius, border) |
| `.mc` | `Card` | `MetricCard` (top accent bar) |
| `.btn-v` | `Button` variant default | orange primary |
| `.btn-g2` | `Button` variant outline | |
| `.btn-gold` | `Button` | gold gradient variant |
| `.tag` / `.ts` `.tg` `.tr` | `Badge` | status variants |
| `.tabs` / `.tab` | `Tabs` | pill style |
| `.ai-panel` | `Card` | `AiPanel` with pulse indicator |
| `.row` | custom | `ListRow` |
| `.overlay` / `.modal` | `Dialog` | `WnModal` |
| `.goal-row-new` | custom | `GoalThreadRow` |
| `.mkt-card` | `Card` | `MarketplaceTalentCard` |
| `.pcard` | `Card` | `PersonCard` |
| `.onboarding-overlay` | `Dialog` fullscreen | `OnboardingWizard` |
| `.thread-banner` | `Alert` | `HomeBanner` |
| `.split-bar` | custom | `WorkTypeSplitBar` |

## Role-Aware Variants

Each dashboard section accepts `role: 'ceo' | 'hr' | 'lead' | 'emp'` and renders different metrics/copy per HTML `MS`, `banners`, `welcomes` objects.

## Responsive Notes

- Sidebar: 228px → slim 50px (prototype); collapse to drawer on `< md`
- Metric strip: 5-col → 2-col on mobile
- `g3` grids: stack on mobile
