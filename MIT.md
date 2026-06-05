# MIT Proposal Notes

## Suggested Emerging Technology

### Cloud-Based SaaS / Multi-Tenant Web System

EvalSys can be presented as a **Cloud-Based SaaS / Multi-Tenant Web System** because it is an online evaluation platform where different users can access the same system while keeping their own data controlled and separated.

#### Cloud-Based

EvalSys is hosted online instead of being installed on only one computer. The frontend can be deployed on **Vercel**, the backend can run on **Render**, and the database can be stored in **MongoDB Atlas**. Because of this, instructors, panel judges, and administrators can access the system through the internet.

#### SaaS

SaaS means **Software as a Service**. Instead of installing the application on every school computer, users can open the EvalSys website, sign in, and use the system as an online service for project evaluation.

#### Multi-Tenant

Multi-tenant means one application can serve multiple users or groups while keeping their records separated. In EvalSys, each instructor can manage their own subjects, blocks, groups, panel judges, rubrics, locks, and results. This prevents one instructor's data from mixing with another instructor's data.

## Defense Explanation

EvalSys applies Cloud-Based SaaS and Multi-Tenant Web System concepts because it is deployed online and allows multiple instructors to manage their own evaluation data in one shared platform. Each instructor has separated subjects, blocks, groups, panel judges, rubrics, and results, while the Super Admin controls system-wide access, instructor limits, feature locks, and account management.

## Why This Fits EvalSys

- It matches the actual system features.
- It is easier to defend than forcing unrelated technologies like AI or blockchain.
- It highlights the system's real strengths: online access, role-based accounts, instructor-owned data, subject isolation, panel grading, and automated result exports.
- It connects directly to the current deployment stack: Vercel, Render, and MongoDB Atlas.

## Recommended Proposal Wording

**EvalSys is a cloud-based multi-tenant project evaluation management system that provides role-based access for Super Admins, instructors, panel judges, and students. It supports instructor-owned subjects, structured group management, rubric-based grading, panel evaluation, subject-level grading locks, and automated CSV grade exports.**
