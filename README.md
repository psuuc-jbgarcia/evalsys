# EvalSys - Automated Rubrics Evaluation System

EvalSys is a modern, block-based automated rubric evaluation platform designed to streamline the grading process for capstone projects, research presentations, and student assessments. It allows administrators to manage blocks (sections), assign panel judges to those blocks, and generate real-time averaged results.

## 🚀 Key Features

- **Student Self-Registration**: Public registration page with data privacy agreement for student self-enrollment.
- **Block-Based Architecture**: Organize groups into specific "Blocks" (e.g., 21-ITE-04) for easier management.
- **Panel-to-Block Assignment**: Assign panel judges to entire blocks in bulk rather than individual groups.
- **Admin Group Management**: Edit existing group details, names, and member lists directly from the dashboard.
- **Bulk CSV/Excel Import**: Rapidly populate the system with 100+ groups or panel accounts using simple CSV templates.
- **Dynamic Rubric System**: Create custom rubrics with multiple criteria and dynamic weightings.
- **Master Export & Maintenance**: Download a global CSV of ALL results and perform a "Master Reset" while preserving accounts.
- **Qualitative Feedback System**: Panels can leave constructive text-based comments alongside numerical scores.
- **Global Grading Lock**: Admins can instantly "freeze" all grading across the entire platform.
- **Smart Result Computation**: Scores are automatically averaged based on assigned panels, ensuring fairness.
- **Panel Completion Tracking**: Live checklist view with green checkmarks and status badges for judges.
- **Submission Review & Safety**: Built-in confirmation system to prevent incomplete or erroneous submissions.
- **Auto-Save & Offline Backup**: Active grading sessions are auto-saved; supports print-ready offline backups.
- **Premium UI/UX**: Responsive dashboard with dark/light aesthetics, micro-animations, and tabbed navigation.
- **Premium UI/UX**: Responsive dashboard with dark/light aesthetics, micro-animations, and tabbed navigation.

## 🚀 System Performance & Optimization

To ensure a smooth experience on free-tier hosting (like Render and MongoDB Atlas), the following optimizations have been implemented:

### 1. Cold Start Mitigation
Free-tier instances on Render "sleep" after 15 minutes of inactivity. To fix the 30-second login delay:
- **Pre-emptive Wake-up**: The frontend (Login and Registration pages) sends a "wake-up" ping to `/api/health` the moment the user lands on the page.
- **Visual Status**: A pulse animation with the message *"Initializing system… (Server is waking up)"* provides immediate feedback during the cold start.

### 2. Database Connection Pooling
In `back-end/src/config/db.js`, the connection is optimized for rapid recovery:
- `maxPoolSize: 10`: Reuses database connections to handle concurrent logins faster.
- `family: 4`: Forces IPv4 to skip DNS resolution delays (common on some networks).
- `serverSelectionTimeoutMS: 5000`: Ensures the app doesn't hang if the DB is also waking up.

### 3. Recommended Keep-Alive (Cron Job)
To keep the server awake 24/7, set up a free cron job at [Cron-job.org](https://cron-job.org/):
- **Name**: EvalSys Keep-Alive
- **URL**: `https://<your-backend-url>.onrender.com/api/health`
- **Schedule**: Every 10 or 14 minutes.
- **Note**: Replace `<your-backend-url>` with your actual Render service URL (e.g., `evalsys-api.onrender.com`).

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router.
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Mongoose ODM).
- **Authentication**: JWT-based secure authentication for Admin and Panel accounts.

## 📦 Project Structure

```text
automated-rubrics/
├── back-end/          # Express API server
└── front-end/         # Vite + React application
```

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)

### 2. Backend Setup
1. Navigate to the `back-end` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `back-end` folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `front-end` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📋 Usage Guide

### Administrator
1. **Manage Blocks**: Create sections/blocks in the "Sections" page.
2. **Bulk Import**: Use the "Bulk Import" buttons on the Accounts or Groups pages to upload data from CSV files. Download the provided templates for the correct format.
3. **Manage Groups**: Add student groups and assign them to specific blocks.
4. **Assign Panels**: Create panel accounts and use the "Assign Panels" page to link judges to blocks.
5. **System Control**: Use the toggle on the Dashboard to lock/unlock grading globally. Use the "Reset" button on the Accounts page to change user passwords.
6. **View Results**: Check the "Results" page to see averaged scores, view panel feedback, and download CSV exports.

### Panel Judge
1. **Dashboard**: See all assigned blocks and their associated groups. Graded groups will show a green checkmark.
2. **Grade Groups**: Click a group card to open the grading form directly. Select the desired rubric, input scores, and leave comments.
3. **Safety Check**: Review the total score in the confirmation popup before final submission.
4. **Recovery**: If the app is closed accidentally, your scores are auto-saved. Use the "Print Offline Backup" if the internet fails.

## 🔮 Future Roadmap

- **Evolving to Multi-Subject (MIT) Platform**: Evolve the entire system from a single-subject application to a robust multi-subject (MIT) platform. This will allow administrators to manage multiple subjects/courses, assign subject-specific active rubrics, filter registrations, and track grading progress scoped to each subject.
- **Deliberation View (Side-by-Side Comparison)**: A detailed admin view to compare individual judge scores side-by-side. This helps identify grading discrepancies (e.g., if one judge is significantly stricter than others) to facilitate fairer deliberations.
- **Real-Time Leaderboard Mode**: A fullscreen, animated "Hall of Fame" view for projecting top-performing groups during awarding ceremonies.
- **Radar Chart Analytics**: Visual performance breakdown per group to identify specific strengths and weaknesses in their presentation or technical implementation.

## 📄 License

Distributed under the MIT License.
