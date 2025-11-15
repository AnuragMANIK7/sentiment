# Sentiviz 17 Design Guidelines

## Design Approach

**Selected System**: Dark Analytics Dashboard (inspired by Awario, Brandwatch, and modern monitoring tools)
- Professional dark theme with vibrant accent colors for data visualization
- Multi-panel layout maximizing information density while maintaining clarity
- Sophisticated data visualization with interactive charts, maps, and word clouds
- Balance between enterprise monitoring utility and modern design polish

## Typography

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN) - all UI text, data labels
- Headings: 700 weight for section titles, 600 for card headers, 500 for body
- Data: Tabular numbers enabled, 400-500 weight for metrics
- Sizes: Hero metrics (text-4xl/5xl), Section headers (text-2xl), Card titles (text-lg), Body (text-base), Labels (text-sm)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Container padding: p-6 on mobile, p-8 on desktop
- Card spacing: p-6 internal, gap-6 between cards
- Section margins: mb-8 between major sections
- Dashboard grid gaps: gap-6 for card layouts

**Grid Structure**:
- Main dashboard: 12-column grid system
- Metric cards: 3-4 columns on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Charts: 2-column layout for comparison views (lg:grid-cols-2)
- Full-width sections for tables and detailed views

## Component Library

### Navigation
- **Top Navigation Bar**: Fixed header with logo left, navigation center, user profile right
- Height: h-16, backdrop blur effect, subtle border-b
- Navigation items: Horizontal menu (Dashboard, Upload, Social Monitor, Reviews, Reports)
- Active state: Underline indicator with primary accent

### Dashboard Cards
- **Metric Cards**: Rounded corners (rounded-xl), subtle shadow (shadow-sm), border treatment
- Structure: Large number (sentiment score), label, trend indicator (up/down arrow), sparkline chart
- Padding: p-6, min-height to maintain consistency
- Hover state: Subtle lift effect (shadow-md transition)

### Charts & Data Visualization
- **Chart Container**: White/surface background, rounded-lg, p-6
- Chart types: Line charts (trend), Donut charts (sentiment distribution), Bar charts (comparison)
- Legend: Bottom placement, horizontal layout
- Grid lines: Subtle, low opacity
- Data points: Larger touch targets for interactivity

### File Upload Interface
- **Drag-Drop Zone**: Large dashed border area (border-2 border-dashed), rounded-lg
- Center-aligned icon (upload cloud), heading, and supported formats text
- Min-height: min-h-64 for comfortable drop target
- Active state: Highlighted border and background tint on drag-over
- File list: Display uploaded files with name, size, remove button

### Review Cards
- **Review Item**: Horizontal card layout with sentiment badge left, review content center, actions right
- Sentiment badge: Pill shape, inline with review (positive/negative/neutral)
- Content: Max 2-3 lines with "Read more" expansion
- Action buttons: "Create Ticket" for negative reviews, "View Details" for all
- Metadata: Source icon, timestamp, platform tag

### Competitive Analysis Section
- **Comparison Cards**: Side-by-side layout for Samsung vs iPhone
- Structure: Product header with logo, sentiment score (large, prominent), trend chart, key metrics grid
- Visual separation: Subtle divider between competitors
- Highlight: Winner/higher score gets accent treatment

### Presentation Generator
- **Slide Preview**: Thumbnail grid showing 5 slides in horizontal scroll or 2x3 grid
- Preview cards: aspect-ratio-[16/9], border, rounded-lg
- Each slide: Title overlay, miniature content preview
- Generate button: Primary CTA, prominent placement
- Export options: Dropdown for PDF/PPT format

### Escalation Tickets
- **Ticket List**: Table or card view toggle
- Card view: Ticket ID, priority badge, review snippet, assigned to, status dropdown
- Priority indicators: High (red), Medium (orange), Low (blue) badges
- Quick actions: Status update, assignment, view full review

### Social Media Monitor
- **Platform Tabs**: Horizontal tabs for Twitter, YouTube, Instagram, News
- Real-time indicator: Animated pulse dot showing "Live" status
- Feed layout: Infinite scroll card list with platform icon, timestamp, sentiment score
- Filters: Sentiment type, date range, platform selectors

## Images

**Hero Section**: None - this is a dashboard application, immediate data visibility is paramount

**Supporting Images**:
- Empty states: Illustrative SVG graphics for "No data yet", "Upload files to begin"
- Platform icons: Twitter, YouTube, Instagram, News portal logos (use Font Awesome brands)
- Product logos: Samsung, Apple for competitive analysis section
- User avatars: Placeholder or uploaded profile pictures in navigation

## Layout Structure

### Main Dashboard View
1. **Header Bar** (full-width, fixed top)
2. **Page Title & Date Range Selector** (mb-8)
3. **Key Metrics Row** (4 cards: Overall Sentiment, Positive %, Negative %, Neutral %)
4. **Trend Charts Row** (2 columns: Sentiment over time, Distribution breakdown)
5. **Competitive Analysis Section** (Samsung vs iPhone side-by-side comparison)
6. **Recent Reviews Preview** (Best 3, Worst 3 in columns)
7. **Quick Actions Panel** (Generate Report, Create Ticket buttons)

### Upload Page
1. **Page Header** (title, instructions)
2. **Drag-Drop Zone** (centered, large)
3. **Upload History** (table below showing previous uploads)

### Social Monitor Page
1. **Platform Tabs** (sticky top)
2. **Filter Bar** (sentiment, date range)
3. **Live Feed** (infinite scroll cards)
4. **Summary Sidebar** (sentiment distribution chart)

### Reviews & Tickets Page
1. **Filter/Sort Bar** (sentiment, priority, status)
2. **View Toggle** (cards vs table)
3. **Review List** (main content area)
4. **Ticket Creation Modal** (overlay for negative reviews)

## Interaction Patterns

- **Hover states**: Subtle scale and shadow increase on interactive cards
- **Loading states**: Skeleton screens for charts, shimmer effect for data loading
- **Transitions**: 200ms ease-in-out for most interactions
- **Tooltips**: Chart data points show values on hover
- **Modals**: Center-screen overlays with backdrop blur for ticket creation, review details
- **Toasts**: Top-right notifications for actions (file uploaded, ticket created)

## Data Visualization Standards

- Sentiment score display: Large circular progress indicator (0-100 scale)
- Positive sentiment: Green gradient tones
- Negative sentiment: Red/orange gradient tones
- Neutral sentiment: Gray/blue tones
- Trend indicators: Up/down arrows with percentage change
- Chart animations: Smooth entry animations on load (stagger for multiple series)