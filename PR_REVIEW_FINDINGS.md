# Pull Request Review Findings

## Summary

This document contains findings from reviewing all open issues and pull requests in the MovieChecker repository.

---

## Open Issues (8 total)

| # | Title | Description |
|---|-------|-------------|
| 1 | Добавление комментариев | Add multi-user comments to cards |
| 2 | Текст эреа и сохранение группы | Fix textarea expansion bug + save last group for user |
| 3 | Права для пользователей | User permissions, validation, and group passwords |
| 4 | Проблема с фотокарточками | Fix photo card display issues |
| 6 | Адаптировать дефолт группу | Duplicate entries to personal list |
| 7 | Дополнения к созданию карточек | Add UnderConsideration status + viewing time for movies |
| 8 | Sidebar | Move tabs to left sidebar for mobile |
| 10 | Notificaitions | Add user notifications |

---

## Open Pull Requests (11 total)

### PR #11 - Image Fill/Zoom/Crop ⚠️ (Non-Draft - Ready for Review)
**Status:** Ready for review (not a draft)
**Related Issue:** #4

**Findings:**
1. ⚠️ **Hardcoded Test Domain:** In `src/frontend/next.config.ts`, the domain `xui123qweqwe.org` is hardcoded in the image remote patterns. This appears to be a placeholder/test domain.

   **Recommendation:** Replace with environment variable or actual production domain:
   ```typescript
   // Instead of hardcoded:
   hostname: 'xui123qweqwe.org',
   
   // Consider using environment variable:
   hostname: process.env.NEXT_PUBLIC_API_DOMAIN || 'localhost',
   ```

2. **Package rename:** The package name was changed from `frontend` to `moviechecker` - this is fine but should be intentional.

---

### PR #14 - Notification System (Draft)
**Related Issue:** #10

**Findings:**
- ✅ Well-structured implementation with backend model, migration, and frontend
- ✅ Proper cascade delete configuration
- ✅ Indexed by (user_id, created_at) for query performance
- ✅ Clean 30-second polling mechanism for updates
- No significant issues found

---

### PR #15 - Sidebar Navigation (Draft)
**Related Issue:** #8

**Findings:**
- ✅ Responsive sidebar implementation
- ⚠️ Build blocked by firewall (fonts.googleapis.com)
- No code issues found

---

### PR #16 - UnderConsideration Status (Draft)
**Related Issue:** #7

**Findings:**
- ✅ Adds `UnderConsideration = 4` status
- ✅ Enables viewing time for all content types
- ✅ Proper i18n translations added
- ⚠️ Build blocked by firewall (fonts.googleapis.com)
- No code issues found

---

### PR #17 - Auto-duplicate Group Entries (Draft)
**Related Issue:** #6

**Findings:**
- ✅ Small and focused change (57 lines)
- ✅ Clean implementation with proper duplicate check
- No issues found

---

### PR #20 - Multi-user Comments (Draft)
**Related Issue:** #1

**Findings:**
- ✅ Comprehensive implementation
- ✅ Proper authorization checks
- ⚠️ 110 files changed - may include build artifacts (verify cleanup)
- ⚠️ Build blocked by firewall (fonts.googleapis.com)

---

### PR #25 - Image Editor with Zoom/Pan (Draft)
**Related Issue:** #4

**Findings:**
- ✅ Clean implementation of image editor component
- ✅ Proper touch support for mobile
- No issues found

---

### PR #26 - Swagger Implementation Roadmap (Draft)
- Documentation/planning PR - no code review needed

---

### PR #27 - Swagger/OpenAPI Documentation (Draft)
- Enhancement PR for API documentation

---

### PR #28 - Codebase Audit Document (Draft)
- Documentation PR with 25 identified issues

---

### PR #29 - Check open issues and review pull requests (Draft)
- This PR (current review task)

---

## Recommendations

1. **PR #11** should address the hardcoded domain before merging
2. **Firewall configuration** needs to allow `fonts.googleapis.com` for Next.js builds
3. All draft PRs appear to be well-implemented for their respective features

---

*Generated on: 2026-01-31*
