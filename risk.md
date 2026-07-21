# Project Improvement Risks

## Recommended Updates


2. Add backend validation schemas

   The backend has some validation, such as score validation in `back-end/src/middleware/validate.middleware.js`, but many controllers still rely on manual request parsing. Adding route-level schemas with a library such as Zod or Joi would reduce bad data, especially for CSV imports, group members, registration links, rubrics, and settings.

3. Improve frontend type safety

   Several frontend pages still use loose `any` types for API responses, errors, and form state. Adding shared API response types would make regressions easier to catch in admin pages, panel grading, and operational workflows.

4. Add backend linting and syntax scripts

   The backend currently only has `dev` and `start` scripts. Add repeatable scripts such as `check`, `lint`, and eventually `test` so backend verification can run before deployment.

5. Remove or gate the hardcoded DNS override

   `back-end/src/index.js` currently forces DNS servers to Cloudflare and Google. That may help locally, but it is unusual in production and can conflict with hosting or network environments. Make it optional behind an environment flag or remove it.

6. Optimize export-all results

   `getSectionResults` already uses aggregation, but `exportAllResults` still loops through sections, groups, and evaluations. For larger events, move this to aggregation or a background job.

7. Replace hard redirects with router-aware navigation

   The frontend API client redirects with `window.location.href` after unauthorized responses. It works, but it bypasses React Router state. A central auth/session handler would feel cleaner and reduce edge cases.

## Suggested Priority

1. Automated tests
2. Backend validation schemas
3. Frontend type safety
4. Backend verification scripts
5. DNS configuration cleanup
6. Export optimization
7. Router-aware auth redirects
