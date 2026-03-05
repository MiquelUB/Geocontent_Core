# PRD: GeoContent Core - Geolocation & Gamification Engine

## 1. Project Overview
GeoContent Core is a white-label geolocation core engine designed to deliver contextualized multimedia content (audio, video, images, text) based on user location using intelligent geofencing. It includes a gamification system (stamps, XP, levels) to engage users.

## 2. Target Audience
- Tourism boards and municipalities.
- Cultural heritage organizations.
- Outdoor activity organizers.

## 3. Key Features
- **Geolocation & Geofencing**: Precise proximity detection using Turf.js to unlock content.
- **Multimedia Content Delivery**: Dynamic serving of location-based assets.
- **Gamification Engine**: Digital passport with stamps, XP calculation, levels, and achievements.
- **Admin Dashboard**: Comprehensive panel for managing municipalities, routes, POIs, and users.
- **Executive Reports**: AI-generated impact reports and PDF exports for administrators.
- **Multi-language Support**: i18n support for Catalan, Spanish, English, and French.
- **PWA Capabilities**: Offline support and mobile optimization.

## 4. Technical Stack
- **Frontend**: Next.js 15+ (App Router), TypeScript, Tailwind CSS, Framer Motion.
- **Backend/Database**: Supabase (PostgreSQL), Prisma ORM.
- **Authentication**: Supabase Auth.
- **Maps**: MapLibre GL, React Map GL.
- **Testing Goal**: Ensure security, data integrity, and smooth user flows across the platform.

## 5. Security Requirements
- Role-based Access Control (RBAC) via Supabase RLS policies.
- Secure API endpoints for admin-only actions.
- Data validation using Zod on all inputs.
- Protection against unauthorized data modification.
