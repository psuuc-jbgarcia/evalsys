# Evolving EvalSys into a Multi-Subject (MIT) Platform

Currently, EvalSys is designed around a single implied subject context. All sections (blocks), student registrations, and rubrics are global and shared. To scale EvalSys for departmental or multi-course use (e.g., multiple IT capstone projects, research methods, and technical subjects), we need to introduce a first-class **Subject** (or Course) model and associate existing sections, rubrics, and evaluations with specific subjects.

This plan details the full schema changes, API routes, controller modifications, and frontend UI/UX enhancements required to seamlessly transition EvalSys into a multi-subject platform.

---

## User Review Required

### Data Migration & Backward Compatibility
Introducing `subject` as a required reference in `Section` and `Rubric` will break existing records that lack this field. We propose a database migration script that:
1. Creates a default subject (e.g., code: `CAP-1`, title: `Capstone Project 1`).
2. Automatically associates all pre-existing sections and rubrics with this default subject.
3. Connects evaluations to their corresponding subject contexts.

### Subject-Scoped Master Resets vs. Global Resets
In the single-subject version, a "Master Reset" wipes all evaluations, groups, and sections. In the multi-subject version, admins should be allowed to perform a **scoped reset** for a single subject (preserving other subjects' active evaluations) or a global reset. We plan to add a dropdown to select the scope before resetting.

---

## Open Questions

### 1. Rubric Reusability across Subjects
Should a rubric belong exclusively to *one* subject, or should rubrics be shareable templates that can be linked to multiple subjects?
* **Option A (Simpler, Proposed)**: Each Rubric belongs to exactly one Subject. This keeps evaluation mapping straightforward.
* **Option B (Advanced)**: Rubrics are global templates, and admins "assign" a rubric to a subject-section combination.

### 2. Subject Selection on Student Registration
When a student registers their group publicly at `/register`, should they first select their **Subject/Course** from a dropdown, which will then dynamically filter the **Assigned Blocks** (sections) dropdown?
* This prevents students in *Capstone 1* from accidentally registering to a *Capstone 2* block.

---

## Proposed Changes

### 1. Backend Core & Database Models

To support multiple subjects, we will introduce a new model and modify existing schemas to reference the subject.

---

#### [NEW] `Subject.js` (back-end/src/models/Subject.js)
Create the new `Subject` mongoose schema:
```javascript
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g. "IT-CAP1"
  title: { type: String, required: true, trim: true },                            // e.g. "Capstone Project 1"
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
```

#### [MODIFY] `Section.js` (back-end/src/models/Section.js)
Link sections directly to a subject:
```diff
 const mongoose = require('mongoose');
 
 const sectionSchema = new mongoose.Schema({
-  name: { type: String, required: true, trim: true },
+  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
   block: { type: String, required: true, trim: true },
   assignedPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Panel' }],
 }, { timestamps: true });
```

#### [MODIFY] `Rubric.js` (back-end/src/models/Rubric.js)
Rubrics are now subject-specific:
```diff
 const rubricSchema = new mongoose.Schema({
   title: { type: String, required: true, default: 'Default Rubric' },
+  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
   criteria: [criteriaSchema],
   isActive: { type: Boolean, default: true },
 }, { timestamps: true });
```

---

### 2. Backend Routes & Controllers

Add new endpoints for subject CRUD, and update existing controllers to support filtering by `subjectId`.

---

#### [NEW] `subject.controller.js` (back-end/src/controllers/subject.controller.js)
Implement standard CRUD for subjects.

#### [NEW] `subject.routes.js` (back-end/src/routes/subject.routes.js)
Mount public/private subject routes for admin and client use.

#### [MODIFY] `index.js` (back-end/src/index.js)
Register the new route handler:
```javascript
app.use('/api/subjects', require('./routes/subject.routes'));
```

#### [MODIFY] `section.controller.js` (back-end/src/controllers/section.controller.js)
* Update `getSections` to optionally filter by `subject` query parameter.
* Populate the `subject` details when returning sections.

#### [MODIFY] `rubric.controller.js` (back-end/src/controllers/rubric.controller.js)
* Modify `getActiveRubric` to require `subjectId` parameter: `getActiveRubric(subjectId)`. Each subject will have its own independent active rubric.
* Ensure rubric creation associates the rubric with a subject.

#### [MODIFY] `group.controller.js` (back-end/src/controllers/group.controller.js)
* Update CSV upload validation to ensure the subject is resolved correctly when importing blocks/groups.

#### [MODIFY] `evaluation.controller.js` (back-end/src/controllers/evaluation.controller.js)
* Scopes results, exports, and master resets to the selected `subjectId`.

---

### 3. Frontend Pages & State Management

Modify admin and panel views to integrate the subject-scoped filtering and management controls.

---

#### [NEW] `Subjects.tsx` (front-end/src/pages/admin/Subjects.tsx)
Add an admin CRUD page to manage subjects (creating subject codes, titles, and toggling active status).

#### [MODIFY] `App.tsx` (front-end/src/App.tsx)
Register `/subjects` path:
```tsx
<Route path="/subjects" element={<ProtectedRoute role="admin"><Subjects /></ProtectedRoute>} />
```

#### [MODIFY] `RegisterGroup.tsx` (front-end/src/pages/RegisterGroup.tsx)
Add a subject selection step:
1. Fetch all active subjects.
2. User selects their Subject (e.g. *Capstone Project 1*).
3. Under the hood, filter the sections dropdown to only display sections/blocks belonging to the chosen subject.

#### [MODIFY] `Dashboard.tsx` (front-end/src/pages/Dashboard.tsx)
* Add a global **Subject Filter Dropdown** at the top header of the admin/panel dashboards.
* Changing the subject will automatically refresh the listed blocks, groups, assigned panel status, and active rubrics.

#### [MODIFY] `Sections.tsx` (front-end/src/pages/admin/Sections.tsx) & `Groups.tsx` (front-end/src/pages/admin/Groups.tsx)
* When adding sections or importing groups, present a **Subject selection field** to ensure proper mapping.

#### [MODIFY] `Results.tsx` (front-end/src/pages/admin/Results.tsx) & `Rubrics.tsx` (front-end/src/pages/admin/Rubrics.tsx)
* Scopes results visualization and download actions by the active Subject.
* Rubrics page will organize criteria checklists tabbed by subject.

---

## Verification Plan

### Automated Tests
* Write unit tests for the backend `Subject` CRUD APIs.
* Verify validation checks (e.g., duplicate subject codes are rejected with `400 Bad Request`).
* Run the Mongoose migration script locally and ensure the database updates correctly without data loss.

### Manual Verification
1. **Admin Subject Control**: Log in as admin, create subjects `IT-CAP1` and `IT-CAP2`.
2. **Subject Association**: Assign blocks/sections to `IT-CAP1` and others to `IT-CAP2`.
3. **Filtered Registration**: Open `/register` in an incognito window, verify that selecting `IT-CAP1` only shows its associated blocks.
4. **Subject-scoped Panel Views**: Log in as a panel judge assigned to blocks in `IT-CAP1`. Verify that you can only view and evaluate groups belonging to `IT-CAP1` blocks, and that the appropriate active rubric loads dynamically.
5. **CSV Global Export & Reset**: Verify that exports separate results by subject and that the reset function offers the choice to wipe data on a per-subject basis.
