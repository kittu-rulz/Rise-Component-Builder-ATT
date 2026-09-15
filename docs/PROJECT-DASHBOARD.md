# Course Projects Dashboard & Multi-Component Workspace Architecture

## Overview

The Course Projects Dashboard & Multi-Component Workspace transforms the single-component Rise Component Builder into a full course authoring environment. Instructional designers can organize multi-module courses with structured sections, manage multiple component instances per section, share media assets, audit course readiness via QA, preview full courses, and export structured ZIP archives.

---

## 1. Schema v3 Specification

Projects are stored locally with `schemaVersion: 3`.

```json
{
  "schemaVersion": 3,
  "id": "proj-1789316047134-xyz",
  "name": "Complete Compliance Course",
  "client": "AT&T Enterprise Learning",
  "description": "Comprehensive compliance course covering cybersecurity and data privacy.",
  "createdAt": "2026-09-13T21:44:07.134Z",
  "updatedAt": "2026-09-13T21:45:20.635Z",
  "isFavorite": false,
  "theme": "att-standard",
  "settings": {
    "targetAudience": "All Employees",
    "deliveryFormat": "rise-web"
  },
  "sections": [
    {
      "id": "sec-intro",
      "title": "Module 1: Introduction",
      "order": 1,
      "collapsed": false,
      "components": ["inst-1", "inst-2"]
    }
  ],
  "instances": [
    {
      "id": "inst-1",
      "componentId": "accordion",
      "name": "Overview Accordion",
      "order": 1,
      "sectionId": "sec-intro",
      "data": { ... },
      "theme": "att-standard",
      "status": "draft",
      "qa": { "passed": true, "issues": [] }
    }
  ],
  "sharedMedia": [
    {
      "id": "media-1",
      "name": "hero-diagram.png",
      "type": "image",
      "size": 1048576,
      "usedIn": ["inst-1"]
    }
  ],
  "projectQa": {
    "lastRun": "2026-09-13T21:45:00.000Z",
    "score": 100,
    "issues": []
  }
}
```

---

## 2. Backward Compatibility & Migration

- **Idempotent Forward Migration (`js/project-migration.js`)**:
  - Legacy Schema v1/v2 records saved in `localStorage` under `rcb_projects` or `rcb_saved_projects` are detected and upgraded on first load without losing authored content.
  - If a legacy project contains single-component data, it is migrated into an initial `instances[0]` entry with an auto-created "Module 1" section.
  - The migration is non-destructive: original timestamps, IDs, and custom state configurations are preserved.

---

## 3. Storage Architecture & Quota Resilience

- **Local Storage (`js/storage.js`)**:
  - Main index stored in `rcb_v3_projects` in `localStorage`.
  - Debounced auto-saving prevents write saturation.
  - Storage quota checks warn authors if browser quota is constrained.
- **Shared Media Storage (`js/media-storage.js`)**:
  - Media blobs are indexed in `IndexedDB` with fallback support.
  - Media reference tracking counts which components link to each asset, preventing accidental deletion of active media.

---

## 4. Multi-Component Workspace Views

1. **Dashboard (`#view-dashboard`)**:
   - Course card grid with metadata badges (component count, section count, last modified date).
   - Real-time search by course title, client, or description.
   - Filter chips: `All Projects`, `Favorites`, `Recent`.
   - Sort dropdown: `Last Modified`, `Alphabetical`, `Component Count`.
   - Template-based course creation (*Standard*, *Compliance*, *Microlearning*, *Blank*).
   - Duplicate, Favorite toggle, JSON Export/Import, and Delete.

2. **Project Overview (`#view-project-overview`)**:
   - Section management: Add, rename, reorder (Up/Down), and delete sections.
   - Component management: Add component instance via visual catalog picker, edit in dedicated editor, duplicate, reorder, or move between sections.
   - Unsectioned container for quick drafting before placing into modules.

3. **Course Preview (`#view-course-preview`)**:
   - Sequential rendering of all active component instances in order.
   - Viewport device switcher (`Desktop 1200px`, `Tablet 768px`, `Mobile 375px`).

4. **Shared Media Library (`#view-project-media`)**:
   - Project-wide media asset management with reference tracking.

5. **Course QA Auditor (`#view-project-qa`)**:
   - Aggregates component completeness, accessibility, and brand token compliance.

6. **Structured Multi-Component ZIP Export (`#btn-export-project`)**:
   - Generates a structured ZIP archive:
     ```
     project-name.zip
     ├── 01-section-1/
     │   ├── 01-overview-accordion/
     │   │   ├── index.html
     │   │   └── media/
     │   └── 02-key-concepts/
     │       ├── index.html
     │       └── media/
     ├── media/
     ├── manifest.json
     └── course-navigation.html
     ```

---

## 5. Review & Testing Commands

```bash
# Run unit tests across all 61 suites
npm test

# Run brand compliance linter
npm run lint:brand

# Run TypeScript typecheck
npm run typecheck

# Full verification pipeline (lint + typecheck + test + coverage + build)
npm run validate
```
