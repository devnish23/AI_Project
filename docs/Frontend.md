# Frontend Documentation

## Pages
- **Applications**
  - Applications.tsx: Main applications list and management
  - ApplicationDetail.tsx: Detailed view for a single application
  - BulkUploadTab.tsx: Bulk upload interface for applications
- **VendorPortals**
  - VendorPortals.tsx: Manage vendor portal integrations
- **Settings**
  - Settings.tsx: User and app settings
- **Reports**
  - Reports.tsx: Generate and view reports
- **Upload**
  - Upload.tsx: File upload interface
- **Auth**
  - Login.tsx: User login form
  - Register.tsx: User registration form
- **Dashboard**
  - Dashboard.tsx: Main dashboard with analytics
- **PatchMgmt**
  - PatchMgmt.tsx: Patch management interface
- **Schedule**
  - ScheduleTab.tsx: Scheduling interface

## Layout Components
- Header.tsx: Top navigation bar
- Sidebar.tsx: Side navigation menu
- Layout.tsx: Main layout wrapper

## Contexts
- AuthContext.tsx: Authentication state and logic
- ThemeContext.tsx: Theme (dark/light) state

## State Management
- applicationsSlice.ts: Redux slice for applications
- uiSlice.ts: Redux slice for UI state

## API Service
- api.ts: Handles all API requests to the backend

## Styling
- Tailwind CSS: Utility-first CSS framework
- globals.css: Global styles 