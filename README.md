# EvalSys - Automated Rubrics Evaluation System

EvalSys is a modern, block-based automated rubric evaluation platform designed to streamline the grading process for capstone projects, research presentations, and student assessments. It allows administrators to manage blocks (sections), assign panel judges to those blocks, and generate real-time averaged results.

## 🚀 Key Features

- **Block-Based Architecture**: Organize groups into specific "Blocks" (e.g., 21-ITE-04) for easier management.
- **Panel-to-Block Assignment**: Assign panel judges to entire blocks in bulk rather than individual groups.
- **Dynamic Rubric System**: Create custom rubrics with multiple criteria and dynamic weightings. Panels can select the specific rubric they want to use for each group.
- **Smart Result Computation**: Scores are automatically averaged based on the number of panel judges assigned to a block, ensuring fairness even if a judge hasn't submitted yet.
- **Real-Time Progress Tracking**: Admins can see which panels have submitted their evaluations and which are still missing in real-time.
- **Export to CSV**: Download professional evaluation results as CSV files with consistent decimal precision and status tracking.
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
2. **Manage Groups**: Add student groups and assign them to specific blocks.
3. **Assign Panels**: Create panel accounts and use the "Assign Panels" page to link judges to blocks.
4. **View Results**: Check the "Results" page to see averaged scores and download CSV exports.

### Panel Judge
1. **Dashboard**: See all assigned blocks and their associated groups.
2. **Grade Groups**: Select a block, choose a group, select the desired rubric, and submit scores.
3. **Tracking**: The interface will show which groups you have already graded.

## 📄 License

Distributed under the MIT License.
