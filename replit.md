# Sentiviz 17 - Advanced Sentiment Analysis Platform

## Overview

Sentiviz 17 is a comprehensive sentiment analysis platform designed for monitoring and analyzing customer feedback and social media conversations for iPhone 17. The application processes reviews from multiple sources (Excel uploads, YouTube, news articles) using AI-powered sentiment analysis (Hugging Face multilingual model) to provide actionable insights through an analytics dashboard.

The platform enables users to:
- Upload and analyze customer reviews from Excel files with automatic location extraction
- Monitor real-time social media sentiment from YouTube and News (up to 6 months of historical data)
- Filter social feeds by date range, platform, and sentiment
- View social media insights and geographic distribution directly on the main dashboard
- Create escalation tickets for negative feedback
- Generate stakeholder presentations with AI-powered insights focused on iPhone 17 performance
- Track global sentiment trends with country-level geographic distribution

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight React Router alternative)
- TanStack Query (React Query) for server state management and data fetching
- Tailwind CSS for utility-first styling with custom design system

**UI Component Library:**
- shadcn/ui components built on Radix UI primitives
- Custom component configuration using "New York" style variant
- Recharts for data visualization (pie charts, line charts, bar charts)
- Design system inspired by Linear, Vercel, and Sprinklr aesthetics
- Inter font family via Google Fonts CDN for typography

**State Management:**
- React Query handles all server state with aggressive caching (staleTime: Infinity)
- Local React state for UI interactions and form handling
- Query invalidation pattern for optimistic updates after mutations

**Routing Structure:**
- `/` - Dashboard with metrics overview, trend visualizations, social media insights, and geographic distribution
- `/upload` - Excel file upload and analysis management
- `/social` - Social media monitoring (YouTube & News) with date range filtering (up to 6 months)
- `/reviews` - Review management and escalation ticket creation
- `/reports` - AI-generated presentation downloads

**Dashboard Features:**
- Platform filtering (All Sources, YouTube, News, Reviews) with real-time chart updates
- Summary stats cards (Total Mentions, Sentiment Score, Active Sources, Coverage) at top
- Multi-panel layout: sentiment distribution, trend analysis, recent mentions
- Geographic distribution panel showing top 10 countries with mention counts and percentages
- Word cloud visualization of trending topics from all content
- Source distribution with horizontal bars showing platform breakdown

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for API endpoints
- Vite middleware integration in development mode for HMR
- Custom request logging and response capture middleware

**API Design Pattern:**
- RESTful endpoints under `/api` prefix
- File upload handling via Multer (in-memory buffer storage)
- JSON response format with consistent error handling
- Session-based request tracking with raw body verification

**Data Processing Pipeline:**
1. Excel file parsing using XLSX library
2. Text extraction from configurable column names (review, comment, text, feedback, content)
3. Batch sentiment analysis with OpenAI integration
4. Parallel processing with concurrency limits (p-limit) and retry logic (p-retry)
5. Result aggregation and storage

**AI Integration:**
- Hugging Face multilingual sentiment analysis model (tabularisai/multilingual-sentiment-analysis) via Inference API
  - Endpoint: https://router.huggingface.co/hf-inference/models/tabularisai/multilingual-sentiment-analysis
  - Requires HUGGINGFACE_API_KEY with "Make calls to Inference Providers" permission
  - Returns 5-class labels (Very Positive, Positive, Neutral, Negative, Very Negative) mapped to 3-class system
  - Used for all sentiment analysis (file uploads and social media monitoring)
  - Processing: 2 concurrent requests, 30-second timeout per request
  - Batch size: 20 reviews per batch for progress tracking
- OpenAI GPT-5 for presentation slide generation from aggregated analytics data
- Batch processing with concurrency limits (p-limit) and retry logic (p-retry) for reliability

### Database Schema

**ORM:** Drizzle ORM with PostgreSQL dialect (@neondatabase/serverless driver)

**Core Tables:**

1. **analyses** - Upload metadata and aggregated results
   - Stores file name, upload timestamp, review counts by sentiment
   - Overall sentiment score (0-100), processing status

2. **reviews** - Individual review records with sentiment scores
   - Content, sentiment classification (positive/negative/neutral)
   - Source tracking (excel, youtube, news) - Twitter and Instagram disabled
   - Product categorization (iphone, other) - Samsung comparison removed
   - Author and timestamp metadata
   - Geographic data: country and region fields extracted from content

3. **tickets** - Escalation tickets for negative reviews
   - Linked to review records via reviewId
   - Priority levels (high, medium, low)
   - Status workflow (open, in_progress, resolved, closed)
   - Assignment and notes fields

4. **social_feeds** - Social media monitoring data (YouTube and News only)
   - Platform-specific content tracking with URL links to original posts
   - Real-time sentiment analysis using Hugging Face model
   - Engagement metrics and author information
   - Date range filtering support (up to 6 months of historical data)
   - Expanded data sources: 9 YouTube search queries for iPhone 17, 10 News queries
   - Default fetch limit: 50 posts per platform
   - Geographic data: country and region fields extracted from content
   - Product categorization (iphone, other) - Samsung comparison removed

5. **presentations** - Generated stakeholder reports
   - AI-generated slide content in JSON format
   - Title, creation timestamp, metadata

**Data Access Layer:**
- Abstracted storage interface (IStorage) for database operations
- PostgreSQL implementation (DbStorage) using Drizzle ORM for production persistence
- All data (analyses, reviews, tickets, social feeds, presentations) persists across sessions
- Type-safe insert schemas generated from Drizzle tables via drizzle-zod

### External Dependencies

**AI Services:**
- Hugging Face multilingual sentiment model via Tabularis API (https://api.tabularis.ai/)
  - No API keys required, free tier
  - Used for all sentiment analysis (file uploads and social media)
- OpenAI API via Replit AI Integrations (GPT-4 model)
  - Used for presentation slide generation only
  - Base URL and API key configured through environment variables

**Social Media APIs:**
- YouTube Data API v3 (requires YOUTUBE_API_KEY secret)
  - Fetches comments from tech review videos
  - 9 search queries covering iPhone 17 (reviews, features, camera, battery, performance, etc.)
  - Retrieves up to 6 months of historical data
- NewsAPI.org (requires NEWS_API_KEY secret)
  - Fetches tech news articles
  - 10 search queries for comprehensive iPhone 17 coverage (reviews, releases, features, etc.)
  - Retrieves up to 6 months of historical data

**Location Extraction:**
- Automatic country and region detection from review/social media content
- Comprehensive country pattern matching with special handling for US variations (US, U.S., United States)
- Supports 18+ countries across North America, Europe, Asia, South America, Oceania, and Middle East
- Geographic distribution analytics available via `/api/analytics/geographic` endpoint

**Database:**
- PostgreSQL database (configured for Neon serverless)
- Connection via DATABASE_URL environment variable
- Drizzle Kit for schema migrations and database push operations

**File Processing:**
- XLSX library for Excel file parsing and data extraction
- Multer for multipart/form-data file upload handling
- Support for .xlsx and .xls formats

**Frontend Libraries:**
- Google Fonts CDN for Inter, Geist, Geist Mono, DM Sans font families
- Recharts for chart rendering (pie, line, bar, area charts)
- date-fns for timestamp formatting, relative time display, and date range calculations
- react-day-picker for Calendar component (date range selection)
- Radix UI for accessible, unstyled component primitives (Popover, Calendar, etc.)

**Build & Development:**
- ESBuild for server-side bundling in production
- TSX for TypeScript execution in development
- Vite plugins: React, runtime error overlay, Replit cartographer, dev banner
- PostCSS with Tailwind CSS and Autoprefixer

**Session Management:**
- connect-pg-simple for PostgreSQL session storage
- Session-based authentication pattern (implementation pending)