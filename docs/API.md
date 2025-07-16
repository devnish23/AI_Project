# API Reference

## Authentication
- POST /api/auth/register — User registration
- POST /api/auth/login — User login
- GET /api/auth/profile — Get user profile
- PUT /api/auth/profile — Update profile

## Applications
- GET /api/applications — List applications
- POST /api/applications — Create application
- PUT /api/applications/:id — Update application
- DELETE /api/applications/:id — Delete application
- POST /api/applications/:id/fetch-vendor-data — Fetch vendor data

## File Upload
- POST /api/upload/applications — Upload applications file
- GET /api/upload/template — Download template
- POST /api/upload/validate — Validate file before upload

## Reports
- POST /api/reports/excel — Generate Excel report
- POST /api/reports/powerpoint — Generate PowerPoint report
- GET /api/reports/templates — Get report templates

## Dashboard
- GET /api/dashboard/summary — Get dashboard summary

## Schedule
- GET /api/schedule — Get schedules
- POST /api/schedule — Create schedule
- PUT /api/schedule/:id — Update schedule
- DELETE /api/schedule/:id — Delete schedule

## Vendor Portals
- GET /api/vendor-portals — List vendor portals
- POST /api/vendor-portals — Add vendor portal
- PUT /api/vendor-portals/:id — Update vendor portal
- DELETE /api/vendor-portals/:id — Delete vendor portal 