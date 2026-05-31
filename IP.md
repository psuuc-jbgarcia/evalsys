# Evolving EvalSys into a Multi-Subject (MIT) Platform

Currently, EvalSys is designed around a single implied subject context. All sections (blocks), student registrations, and rubrics are global and shared. To scale EvalSys for departmental or multi-course use (e.g., multiple IT capstone projects, research methods, and technical subjects), we need to introduce a first-class **Subject** (or Course) model and associate existing sections, rubrics, and evaluations with specific subjects.

This plan details the full schema changes, API routes, controller modifications, and frontend UI/UX enhancements required to seamlessly transition EvalSys into a multi-subject platform.

---

## User Review Required

### Data Migration & Backward Compatibility
Status: **Done - deployed migration completed.**

Introducing `subject` as a required reference in `Section` and `Rubric` will break existing records that lack this field. We propose a database migration script that:
1. Creates a default subject:
   * Code: `IPT`
   * Title: `Integrative Programming Technologies`
2. Automatically associates all pre-existing sections and rubrics with this default subject.
3. Connects evaluations to their corresponding subject contexts.
4. Keeps old records readable during rollout until the migration has been verified.

Recommended migration behavior:
* If the default subject already exists, reuse it instead of creating a duplicate.
* Add `subject` to all sections without one.
* Add `subject` to all rubrics without one.
* Add `subject` to all evaluations by resolving the evaluation's group -> section -> subject.
* Log how many subjects, sections, rubrics, and evaluations were updated.
* Run the migration before making `subject` required in the schema.

### Subject-Scoped Master Resets vs. Global Resets
In the single-subject version, a "Master Reset" wipes all evaluations, groups, and sections. In the multi-subject version, admins should be allowed to perform a **scoped reset** for a single subject (preserving other subjects' active evaluations) or a global reset. We plan to add a dropdown to select the scope before resetting.

Planned reset options:
* **Scoped Reset**: Deletes evaluations, groups, and sections only for the selected subject.
* **Global Reset**: Deletes evaluations, groups, and sections across all subjects.
* Admin must choose the reset scope from a dropdown before confirming.
* The confirmation text should clearly include the selected scope, for example `RESET IPT` for the Integrative Programming Technologies scoped reset.
* Admin and panel accounts should be preserved unless a future superadmin-only account reset is added.

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

## Registration & Export Upgrade

### Structured Member Registration
The current registration flow accepts members as one comma-separated text field. In the future version, the registration form should use structured member fields so student names can be exported cleanly and sorted alphabetically.

Each group registration should allow dynamic member rows:

```text
Member 1
Last Name
First Name
Middle Name

Member 2
Last Name
First Name
Middle Name

[+ Add Member]
```

Rules:
* `Last Name` and `First Name` are required.
* `Middle Name` is optional.
* Groups can add multiple members using an **Add Member** button.
* Individual registrations use one member row.
* Existing old records with `members` stored as strings should remain supported during migration.

Recommended future data shape:

```javascript
members: [
  {
    lastName: "Garcia",
    firstName: "Jerico",
    middleName: "Bautista"
  }
]
```

### Per-Block Member Grade Export
The Results page should support exporting grades per selected block. This is useful when an instructor needs a clean alphabetized grade list for all students in one block.

When an admin selects a block in Results, provide two export options:

```text
Download Group Summary CSV
Download Member Grades CSV
```

Group summary export should remain one row per group:

```csv
Block,Group,Members,Group Score,Evaluated By,Missing Panels,Comments
```

Member grades export should be one row per member:

```csv
Block,Group,Last Name,First Name,Middle Name,Group Score
```

Export rules:
* Export only the currently selected block.
* Sort members alphabetically by `Last Name`, then `First Name`, then `Middle Name`.
* Every member receives the same final group score.
* If a group evaluation is incomplete, show `Pending Complete Evaluation` as the score.

---

## Role Hierarchy: Super Admin

### Overview
To support instructors using the admin side for their own subject's evaluation, a three-tier role system is introduced:

| Role | Who | Access |
|---|---|---|
| `superadmin` | System owner | Full system access — manages all users (including admins), all subjects, global reset, and system settings |
| `admin` | Instructor | Scoped to one or more assigned subjects/courses; manages sections, groups, rubrics, panel assignments, and results only for those assigned subjects. Admin account creation should be handled by the superadmin. |
| `panel` | Panel judge / evaluator | Grades groups assigned to them |

