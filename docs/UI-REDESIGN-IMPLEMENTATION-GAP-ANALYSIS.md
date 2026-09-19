# Rise Component Builder AT&T — UI Redesign Implementation Gap Analysis

**Document Version:** 1.0.0  
**Target Specification:** `RISE_COMPONENT_BUILDER_ATT_UI_10_OF_10_PROMPT.md` (Structural UI/UX Redesign)  
**Date:** September 19, 2026  
**Status:** In Progress / Planning & Execution Phase  

---

## Executive Summary

This gap analysis compares the existing repository architecture against the 24 sections, 11 mandatory structural requirements, and 6 implementation phases of the comprehensive UI Redesign specification. It outlines the current state, exact required changes, affected files, implementation complexity, dependencies, and test verification strategies for each requirement.

---

## 1. Mandatory Structural Architecture Changes

| # | Structural Requirement | Current Implementation | Required Change | Complexity | Affected Files |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Remove Component-Category Sidebar from Projects Dashboard** | Sidebar is visible on the left even when viewing the Dashboard, showing 26 component categories that are irrelevant to course project management. | Hide the component-category sidebar completely in Dashboard mode. The Dashboard must occupy the full width with a dedicated, focused course management layout. | Medium | [`index.html`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/index.html), [`app.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/app.js), [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css), [`design/dashboard.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/dashboard.css) |
| **2** | **Contextual Navigation (Dashboard vs. Project vs. Library)** | Navigation bar currently mixes single-component catalog links, settings, and workspace panels simultaneously. | Contextualize all navigation: <br>• **Dashboard**: Global branding, search/filter, New Project, Import JSON.<br>• **Project Workspace**: Breadcrumb (`Courses > [Name]`), Workflow tabs (`Build` → `Preview` → `QA` → `Export`).<br>• **Component Library**: Contextual drawer/overlay. | High | [`index.html`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/index.html), [`app.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/app.js), [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css) |
| **3** | **Three-Zone Course Workspace (Outline / Canvas / Inspector)** | Course Overview is a separate full-page list of cards; editing a component navigates completely away to the single-component editor. | Implement a unified **Three-Zone Workspace**:<br>1. **Left Zone**: Interactive Course Outline (Sections, Components, Reorder, Add Item).<br>2. **Center Zone**: Live Authoring & Preview Canvas.<br>3. **Right Zone**: Contextual Component Inspector (Content, Interaction, Appearance, Completion). | High | [`js/dashboard/project-overview.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/dashboard/project-overview.js), [`app.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/app.js), [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css), [`design/project-overview.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/project-overview.css) |
| **4** | **Unified Workflow Navigation (`Build` → `Preview` → `QA` → `Export`)** | Workflow steps are fragmented across separate full-screen workspace views with disparate back buttons. | Consolidate the course workflow into a persistent, top-level segment control: `Build` (3-zone workspace), `Preview` (viewport testing), `QA` (preflight audit), and `Export` (Rise 360 packaging). | Medium | [`app.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/app.js), [`index.html`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/index.html), [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css) |
| **5** | **Component Library Drawer / Panel Replacing Large Modal** | Adding a component opens an oversized dialog modal that disrupts context. | Replace the modal with a responsive slide-out **Component Library Drawer** or floating palette with search, category filtering, and one-click insert into the active module. | Medium | [`js/dashboard/project-overview.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/dashboard/project-overview.js), [`js/catalog.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/catalog.js), [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css) |
| **6** | **Consolidated New Project Experience** | Options (Blank, Starter, Import) were split across onboarding hero cards and header buttons. | Consolidate Blank Course, 3-Module Starter, and Import JSON into a unified, polished modal dialog with clear visual selection cards. | Low | [`js/dashboard/dashboard-view.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/dashboard/dashboard-view.js), [`design/dashboard.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/dashboard.css) |
| **7** | **Compact Project Header** | Current overview uses a tall hero card that consumes vertical viewport space. | Replace with a compact header bar showing breadcrumb navigation, editable course title, status badge, and workflow tabs. | Low | [`js/dashboard/project-overview.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/dashboard/project-overview.js), [`design/project-overview.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/project-overview.css) |
| **8** | **Elimination of Competing / Duplicate Actions** | Multiple "Add Component", "New Project", and "Import" buttons in both header and body. | Rationalize actions: one primary action per context, clear secondary buttons. | Low | [`js/dashboard/dashboard-view.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/dashboard/dashboard-view.js), [`js/dashboard/project-overview.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/dashboard/project-overview.js) |
| **9** | **Complete Dark Theme Implementation** | Dark mode primarily styled the builder chrome, with some workspace cards and inspector tabs lacking full dark token mapping. | Comprehensive dark theme coverage across outline tree, central canvas, inspector tabs, inputs, modal dialogs, and toasts using `--att-*` dark tokens. | Medium | [`design/att-tokens.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/att-tokens.css), [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css), [`design/dashboard.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/dashboard.css), [`design/project-overview.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/project-overview.css) |
| **10** | **Responsive Breakpoint Transformations** | Fixed layouts or standard scrolling on smaller screens. | Implement defined layouts: <br>• **Desktop (> 1200px)**: 3-zone layout.<br>• **Tablet (768px–1199px)**: Collapsible drawers for Outline and Inspector.<br>• **Mobile (< 768px)**: Single active pane with bottom navigation switch. | High | [`styles.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/styles.css), [`design/project-overview.css`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/design/project-overview.css) |
| **11** | **Finalized Post-Publish Scope** | 4 tools were listed; sticky notes and journal had experimental status. | Standardize strictly on the 3 finalized tools: **Persistent Glossary**, **Persistent Resources**, and **Help & Support**. | Low | [`js/post-publish/workflow-shell.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/post-publish/workflow-shell.js), [`js/post-publish/schema.js`](file:///d:/projects/Rise%20Component%20Builder/v4_ATT_Specific/js/post-publish/schema.js) |

---

## 2. Six-Phase Implementation Plan

### **Phase 1: Navigation & Header Contextualization**
- Hide component-category sidebar when in Dashboard mode (`#dashboard-workspace`).
- Build contextual header navigation matching active state (`Dashboard` vs. `Course Workspace` vs. `Standalone Catalog`).
- Test: Vitest navigation tests, header switching.

### **Phase 2: New Project Experience & Dashboard Redesign**
- Refine Dashboard layout: compact controls bar, project cards grid, empty state onboarding.
- Build consolidated New Project modal with 3 starter cards (Blank, 3-Module, Import).
- Test: `tests/unit/dashboard-workspace.test.js`.

### **Phase 3: Three-Zone Course Workspace Architecture**
- Implement Left Outline Tree (Sections, Module drag-drop, item selection).
- Implement Central Live Canvas (Auto-preview of selected block or full module).
- Implement Right Contextual Inspector (Connected to `js/editor.js` schema forms).
- Test: Course authoring interaction tests.

### **Phase 4: Unified Workflow Pipeline (Build → Preview → QA → Export)**
- Integrate persistent workflow tabs at the course level.
- Streamline transitions between Build (3-zone), Preview (Device switcher), QA (Preflight), and Export (ZIP Generator).
- Test: `tests/unit/final-10-of-10-audit.test.js`, workflow transition tests.

### **Phase 5: Component Library Drawer & Quick Insert**
- Build slide-out Component Drawer triggered by "+ Add Component" in the outline tree.
- Search, filter by Rise relationship / product maturity, thumbnail preview, instant insertion into active section.
- Test: Component insertion and schema validation tests.

### **Phase 6: Comprehensive Theming, Responsive Layouts & Post-Publish Consolidation**
- Deep dark mode across all 3 zones, inputs, tree nodes, cards, and modal dialogs.
- Responsive breakpoints (`1440x900`, `1280x800`, `1024x768`, `768x1024`, `390x844`, `360x800`).
- Finalize 3 Post-Publish Tools: Glossary, Resources, Help & Support.
- Final build stamp, regression test run, and Git commit.

---

## 3. Test & Verification Strategy

1. **Automated Unit Tests**: Maintain 100% pass rate across all 1,761 tests and add coverage for the new 3-zone workspace.
2. **Brand Linter**: Enforce zero color literals and 100% token adherence (`npm run lint:brand`).
3. **Multi-Viewport Captures**: Re-capture and verify all 6 viewports with the new 3-zone and drawer layouts.
4. **Live Deployment Verification**: Version bump and deploy to GitHub Pages with matching SHA verification.
