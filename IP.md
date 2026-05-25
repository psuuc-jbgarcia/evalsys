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

## Role Hierarchy: Super Admin

### Overview
To support instructors using the admin side for their own subject's evaluation, a three-tier role system is introduced:

| Role | Who | Access |
|---|---|---|
| `superadmin` | System owner | Full system access — manages all users (including admins), all subjects, global reset, and system settings |
| `admin` | Instructor | Scoped to their assigned subject — manages sections, groups, rubrics, panel assignments, and results for that subject only | AND REMOVE create acc for admin the super admin is responsible for this
| `panel` | Panel judge / evaluator | Grades groups assigned to them |

