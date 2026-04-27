# Archive Report: multi-restaurante

## Change Summary

**Change**: multi-restaurante
**Archived**: 2026-04-27
**Pipeline**: full (proposal + tasks + spec + design + verify)
**Verdict**: pass with warnings

---

## What Was Implemented

The multi-restaurante change transformed the system's relationship between users and restaurants from 1:1 to N:N, allowing:

1. **N:N Usuario↔Restaurante Relationship**
   - Created `usuario_restaurantes` junction table with roles (owner/manager/staff)
   - Migrated existing 1:1 relationships to N:N structure
   - Implemented `UsuarioRestaurante` entity with domain events

2. **Restaurant CRUD Operations (Admin)**
   - Create, list, update, and soft-delete restaurants
   - Team management (link/unlink users to restaurants)
   - Owner self-removal prevention

3. **Menu CRUD Per Restaurant**
   - Categories, products, modifier groups, and combos now scoped by `restauranteId`
   - Restaurant selector component in admin UI
   - All admin pages filtered by selected restaurant context

4. **Offline Sync Isolation**
   - IndexedDB cache namespaced by `restaurant_${restauranteId}_`
   - Sync queues per restaurant
   - Offline orders linked to correct restaurant

---

## Artifacts Created

| Artifact | Description |
|----------|-------------|
| `proposal.md` | Original proposal with scope and approach |
| `tasks.md` | 69 tasks across 7 phases |
| `spec.md` | Full delta spec (ADDED, MODIFIED, REMOVED requirements) |
| `design.md` | Architecture decisions, data flow, file changes |
| `verify-report.md` | Verification evidence and compliance matrix |
| `archive-report.md` | This audit trail |

---

## Merged Specs

### `openspec/specs/admin/spec.md`

**ADDED Requirements:**
- N:N Usuario-Restaurante Relationship
- User-Restaurant Linking
- Restaurant Selector in Admin UI
- Offline Sync Scoped by Restaurant

**MODIFIED Requirements:**
- Category CRUD → Restaurant Scoped
- Product CRUD → Restaurant Scoped
- Offline Menu Access → Restaurant Scoped

**REMOVED Requirements:**
- Usuario.restauranteId Unique Constraint

---

## Verification Lineage

**Verdict**: pass with warnings

| Metric | Result |
|--------|--------|
| Tasks Completed | 68/69 (98.5%) |
| Build Status | ❌ FAILS (pre-existing issue in `src/lib/auth/admin.ts`) |
| Test Status | 579 passed, 3 failed (pre-existing failures in `admin.test.ts`) |
| Compliance | 6/6 GWT scenarios implemented |

**Pre-existing Issues (NOT caused by multi-restaurante):**
1. Build failure: `admin.ts` imports `cookies` from `next/headers` — unrelated file, pre-existing architectural issue
2. Test failures: `admin.test.ts` has 3 failing tests due to Next.js 16 mocking issues
3. Task 1.6: Manual staging migration execution not verifiable automatically

---

## Domain Affected

- **Admin** — primary domain with new multi-restaurant capabilities
- **Cardápio** — scoped by restaurantId (modified entities)
- **Autenticação** — user-restaurant relationship changed

---

## Archive Location

```
openspec/changes/archive/2026-04-27-multi-restaurante/
├── proposal.md
├── tasks.md
├── spec.md
├── design.md
├── verify-report.md
└── archive-report.md (this file)
```

---

*Archived by SDD pipeline on 2026-04-27*
