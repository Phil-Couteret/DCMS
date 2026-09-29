# DCMS Project Context

## First thing every session
Read the table of contents in /data/dcms/app/docs/ORIGINAL_FEATURES.md at session start, then read only the relevant section(s) for the work being done. This is the complete reference for what the original system had. Use it instead of reading frontend-old files.

## Project structure
- backend/ — NestJS 12 API on port 4000
- frontend/ — Next.js 16 public site on port 3000
- backoffice/ — Next.js 16 admin interface on port 3001
- frontend-old/ — Original React app (reference only, do not modify)
- backend-old/ — Original Express backend (reference only, do not modify)
- docs/ORIGINAL_FEATURES.md — Complete feature reference

## Rules
- Read the ORIGINAL_FEATURES.md table of contents at session start, then only the relevant section(s)
- Never modify frontend-old/ or backend-old/
- All commands must use full absolute paths
- Commit and push after every completed feature
- Test endpoints before committing
