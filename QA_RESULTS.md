# QA Results

## QA Verdict

Not fully ready for final deployment yet. Build is clean, but a few issues should still be fixed before final release.

## P1 Must Fix

### 1. Deleting a group still deletes submitted evaluations

- File: `back-end/src/controllers/group.controller.js`
- Original issue: `Evaluation.deleteMany({ group: group._id })` deleted submitted results.
- Risk: Submitted scores could be lost when a group is removed.
- Status: **Fixed**
- Current behavior: deleting a group archives/snapshots submitted evaluations before removing the active group.

### 2. Deleting a block still deletes submitted evaluations

- File: `back-end/src/controllers/section.controller.js`
- Original issue: block deletion deleted evaluations for all groups in the block.
- Risk: Submitted scores could be lost when a block is removed.
- Status: **Fixed**
- Current behavior: deleting a block archives/snapshots submitted evaluations before removing active groups and the block.

### 3. Super Admin bulk panel import assigns panels to Super Admin, not the selected instructor

- File: `back-end/src/controllers/user.controller.js`
- Original issue: bulk import used `payload.createdBy = req.user._id`.
- Risk: Imported panel accounts could belong to Super Admin instead of the intended instructor, causing assignment, rubric, and scoring confusion.
- Status: **Fixed**
- Current behavior: Super Admin bulk panel import uses `x-instructor-id` or row `createdBy` to assign the panel owner.

## P2 Should Fix

### 4. Public block endpoint can expose all sections if called without a subject

- File: `back-end/src/routes/section.routes.js`
- File: `back-end/src/controllers/section.controller.js`
- Issue: public access is allowed, and the controller can return all sections when no subject is supplied.
- Status: **Fixed**
- Current behavior: public block requests now require a subject. Requests without a subject return an error instead of exposing all blocks.

### 5. Native browser `confirm()` is still used in several places

- Examples:
  - `front-end/src/pages/panel/Grade.tsx`
  - `front-end/src/pages/admin/Groups.tsx`
  - `front-end/src/pages/admin/Sections.tsx`
  - `front-end/src/pages/admin/Rubrics.tsx`
- Issue: native browser confirms are still present.
- Status: **Fixed**
- Current behavior: confirmation actions now use the custom EvalSys modal style through `front-end/src/hooks/useConfirmDialog.tsx`.

### 6. Instructor/subject switching still uses full page reloads

- File: `front-end/src/components/Layout.tsx`
- Issue: switching instructor or subject uses `window.location.reload()`.
- Risk: the app works, but switching can feel jumpy or reload twice.
- Status: **Fixed**
- Current behavior: switching instructor or subject updates local state/storage and remounts the active page content without reloading the whole browser app.

## P3 Later

### 7. No frontend `.env.example` exists

- Issue: backend has `.env.example`, but frontend does not.
- Recommendation: add `front-end/.env.example` with:

```env
VITE_API_URL=http://localhost:5000/api
```

### 8. Proposal files can become Supabase orphans

- Issue: deleting or resetting groups does not delete proposal files from Supabase Storage.
- Current mitigation: Super Admin Operations can detect orphan proposal files.
- Recommendation: add a controlled cleanup button later, with confirmation and audit logging.

## Good Checks

- Frontend `npm run build` passed.
- Backend JavaScript syntax checks passed.
- Maintenance mode, announcement, password flow, proposal access, rubric ownership, grading lock, and Super Admin operations are generally wired correctly.
- Supabase proposal access is protected through backend-generated signed URLs and group ownership checks.
