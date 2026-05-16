# System Scalability & Future Upgrades

This document outlines potential performance bottlenecks and recommended architectural upgrades as the **Automated Rubrics System** grows from a few dozen users to hundreds or thousands of concurrent evaluations.

## 1. Current Status (Small-Scale)
The system is currently optimized for small to medium events (e.g., ~10 groups per block). It uses parallel `Promise.all` queries which work well at this scale due to simplicity and readability.

## 2. Identified Bottlenecks

### A. The N+1 Query Problem
In `getSectionResults` (Evaluation Controller), the system currently performs a separate database query for every group in a section.
*   **Current Logic**: 10 Groups = 20+ Database Queries.
*   **Risk**: As the number of groups or blocks grows, database latency will increase, making the Results page feel sluggish.

### B. Sequential Data Export
The `exportAllResults` function uses nested `await` calls inside loops.
*   **Risk**: For very large datasets (thousands of evaluation records), the server may time out before the CSV is generated.

## 3. Recommended Future Upgrades

### Phase 1: Query Optimization (High Priority)
*   **MongoDB Aggregation Pipeline**: Replace `map` loops with a single `.aggregate()` call. Use `$lookup` to join Groups and Evaluations in one database trip.
*   **Selective Population**: Only `populate()` fields that are strictly necessary for the current view to reduce memory overhead.

### Phase 2: Backend Architecture
*   **Caching with Redis**: Implement caching for the `Results` view. Since scores only change when a panel submits, you can cache the computed averages and invalidate the cache only on new submissions.
*   **Background Jobs**: For "Master Resets" or large "Bulk Exports," use a background worker (like BullMQ) to process the task without blocking the main API thread.

### Phase 3: Infrastructure
*   **Database Indexing**: Add compound indices for frequently filtered queries:
    ```javascript
    evaluationSchema.index({ group: 1, isSubmitted: 1 });
    groupSchema.index({ section: 1 });
    ```
*   **Vertical/Horizontal Scaling**: Move from Render's Free/Starter tier to a dedicated instance with at least 1GB of RAM to handle high concurrent socket connections during peak grading hours.

## 4. Summary Table

| Feature | Current Limit | Upgraded Limit | Strategy |
| :--- | :--- | :--- | :--- |
| **Grading Results** | ~50 Groups | 5,000+ Groups | Aggregation Pipelines |
| **Data Export** | ~200 Records | Unlimited | Streaming Exports |
| **Simultaneous Users**| ~20-30 Panels | 500+ Panels | Redis Caching & Dedicated RAM |

---
*Created on 2026-05-16*
