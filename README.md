# EvalSys - Automated Rubrics Evaluation System

EvalSys is a modern, block-based automated rubric evaluation platform designed to streamline the grading process for capstone projects, research presentations, and student assessments. It allows administrators to manage blocks (sections), assign panel judges to those blocks, and generate real-time averaged results.

## 🚀 Key Features

- **Block-Based Architecture**: Organize groups into specific "Blocks" (e.g., 21-ITE-04) for easier management.
- **Panel-to-Block Assignment**: Assign panel judges to entire blocks in bulk rather than individual groups.
- **Bulk CSV/Excel Import**: Rapidly populate the system with 100+ groups or panel accounts using simple CSV templates that open in Excel.
- **Dynamic Rubric System**: Create custom rubrics with multiple criteria and dynamic weightings. Panels can select the specific rubric they want to use for each group.
- **Qualitative Feedback System**: Panels can leave constructive text-based comments alongside numerical scores, which are automatically included in the final results and exports.
- **Global Grading Lock**: Admins can instantly "freeze" all grading across the entire platform with a single toggle, preventing any changes once an event is over.
- **Smart Result Computation**: Scores are automatically averaged based on the number of panel judges assigned to a block, ensuring fairness even if a judge hasn't submitted yet.
- **Panel Completion Tracking**: Judges see a live "checklist" view on their dashboard with green checkmarks and status badges indicating which groups are graded vs. pending.
- **Submission Review & Safety**: A built-in confirmation system reviews scores and warns judges of incomplete criteria before final submission to prevent errors.
- **Auto-Save & Offline Backup**: Active grading sessions are auto-saved locally. Judges can even generate a print-ready offline backup if internet connection is lost during a presentation.
- **Export to CSV**: Download professional evaluation results as CSV files including final scores, member lists, and all panel feedback.
- **Premium UI/UX**: A sleek, responsive dashboard built with a modern dark/light aesthetic, micro-animations, and tabbed navigation for high-volume data management.

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

- **Deliberation View (Side-by-Side Comparison)**: A detailed admin view to compare individual judge scores side-by-side. This helps identify grading discrepancies (e.g., if one judge is significantly stricter than others) to facilitate fairer deliberations.
- **Real-Time Leaderboard Mode**: A fullscreen, animated "Hall of Fame" view for projecting top-performing groups during awarding ceremonies.
- **Radar Chart Analytics**: Visual performance breakdown per group to identify specific strengths and weaknesses in their presentation or technical implementation.

## 📄 License

Distributed under the MIT License.
