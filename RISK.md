# Notable Risks To Fix After System Use

This file tracks technical risks found during project review. These are not immediate blockers for running the current evaluation, but they should be fixed after the system has been used.

## 1. Rubric Validation Can Disagree With Submitted Rubric

- File: `back-end/src/middleware/validate.middleware.js`
- Current issue: `validateScores` validates against the active rubric, but the panel grading form submits a selected `rubricId`.
- Risk: If panels can select a non-active rubric, the backend may validate scores against one rubric but save the evaluation under another rubric.
- Suggested fix: Validate scores against the submitted `rubricId`, or restrict panels to only the active rubric.

## 2. Evaluation Total May Not Be Saved During Update

- Files:
  - `back-end/src/controllers/evaluation.controller.js`
  - `back-end/src/models/Evaluation.js`
- Current issue: `submitEvaluation` uses `findOneAndUpdate`, but the `pre('save')` hook in `Evaluation.js` only runs on `.save()`.
- Risk: The `total` field may not be recalculated when a panel submits or updates scores.
- Suggested fix: Compute `total` directly in `submitEvaluation` before `findOneAndUpdate`, or switch to loading the evaluation document and calling `.save()`.

## 3. Results Page Still Assumes Default Rubric Fields

- File: `front-end/src/pages/admin/Results.tsx`
- Current issue: The results table hard-codes rubric labels and max scores.
- Risk: If admins create custom rubrics, the Results page may show incomplete or incorrect columns.
- Suggested fix: Build result columns dynamically from the rubric used in evaluations or from the currently active rubric.

## 4. CSV Import Parser Is Too Simple

- Files:
  - `front-end/src/pages/admin/Users.tsx`
  - `front-end/src/pages/admin/Groups.tsx`
- Current issue: CSV import uses simple `split(',')`.
- Risk: Names, comments, or fields with quoted commas can break imports.
- Suggested fix: Use a real CSV parser such as Papa Parse, or add backend-side CSV import validation.

## 5. Group Duplicate Check Uses Raw Regex Input

- File: `back-end/src/controllers/group.controller.js`
- Current issue: Duplicate checking builds a regular expression directly from the group name.
- Risk: Group names containing regex characters such as `(`, `[`, `.`, `*`, or `?` can cause incorrect matches or regex errors.
- Suggested fix: Escape user input before building the regex, or use normalized fields for exact case-insensitive duplicate checks.
