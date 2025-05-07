# Micro-Finance Management System

A comprehensive web application designed to manage micro-finance operations, including client management, loan processing, installment tracking, and financial reporting.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [File Structure](#file-structure)
- [License](#license)

## Features

- **Client Management:** Add, view, update, and search for clients.
- **Loan Management:** Create, view, edit, and manage loan applications. Automated calculation of installments and due dates.
- **Installment Tracking:** Record and track loan installment payments. View upcoming and overdue payments.
- **Financial Reporting:** Generate reports such as client summaries and net profit analysis.
- **Admin Management:** Secure section for managing administrator accounts.
- **User Authentication:** Secure login for administrators.

## Technology Stack

### Backend

- **Node.js:** JavaScript runtime environment.
- **Express.js:** Web application framework for Node.js.
- **MySQL:** Relational database management system.
- **Sequelize:** Promise-based Node.js ORM for MySQL.
- **JWT (JSON Web Tokens):** For secure authentication.
- **pdfkit:** PDF generation library.

### Frontend

- **React:** JavaScript library for building user interfaces.
- **Material-UI (MUI):** React UI framework.
- **Axios:** Promise-based HTTP client for making API requests.
- **Date-fns:** Modern JavaScript date utility library.
- **Chart.js:** For data visualization (if applicable for charts beyond examples).

## Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js) or [Yarn](https://yarnpkg.com/)
- [MySQL](https://www.mysql.com/downloads/) Server

## Getting Started

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Database Setup:**
    *   Ensure your MySQL server is running.
    *   Create a database (e.g., `micro_finance_db`).
    *   Import the schema from `schema.sql` located in the root project directory into your database.
    *   Configure your database connection details in `backend/config/config.json` (or create one if it doesn't exist, based on `config.example.json` if provided).
        ```json
        {
          "development": {
            "username": "your_db_user",
            "password": "your_db_password",
            "database": "micro_finance_db",
            "host": "127.0.0.1",
            "dialect": "mysql"
          }
          // ... other environments
        }
        ```
4.  **Environment Variables:**
    *   Create a `.env` file in the `backend` directory.
    *   Add necessary environment variables, such as `JWT_SECRET`.
        ```env
        PORT=5000
        JWT_SECRET=your_jwt_secret_key
        DB_HOST=127.0.0.1
        DB_USER=your_db_user
        DB_PASSWORD=your_db_password
        DB_NAME=micro_finance_db
        ```
5.  **Run the backend server:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The backend server should typically start on `http://localhost:5000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Environment Variables:**
    *   Create a `.env` file in the `frontend` directory.
    *   Define the backend API base URL:
        ```env
        REACT_APP_API_BASE_URL=http://localhost:5000
        ```
4.  **Run the frontend development server:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The frontend application should typically start on `http://localhost:3000`.

## File Structure

```
micro-finance/
├── backend/
│   ├── config/         # Database and other configurations
│   ├── controllers/    # Request handlers (business logic)
│   ├── middleware/     # Custom middleware (e.g., auth)
│   ├── migrations/     # Database migration files (if using Sequelize migrations)
│   ├── models/         # Sequelize models (database table definitions)
│   ├── routes/         # API route definitions
│   ├── seeders/        # Database seed files (if using Sequelize seeders)
│   ├── utils/          # Utility functions
│   ├── server.js       # Main server entry point
│   ├── package.json
│   └── .env.example    # Example environment variables
├── frontend/
│   ├── public/         # Static assets and index.html
│   ├── src/
│   │   ├── api/          # Axios instance and API call definitions
│   │   ├── assets/       # Images, fonts, global styles
│   │   ├── components/   # Reusable UI components (Vui specific)
│   │   ├── examples/     # Theme-specific example components
│   │   ├── layouts/      # Page structure components (Dashboard, Auth, etc.)
│   │   ├── routes/       # Application routes configuration
│   │   ├── utils/        # Utility functions (e.g., auth helpers)
│   │   ├── views/        # Page-level components (deprecated, use layouts)
│   │   ├── App.js        # Main application component
│   │   ├── index.js      # Entry point for React application
│   │   └── theme/        # Theme configuration (colors, typography, etc.)
│   ├── package.json
│   └── .env.example    # Example environment variables
├── .gitignore          # Specifies intentionally untracked files that Git should ignore
├── README.md           # This file
├── LICENSE.md          # Project license information
└── schema.sql          # SQL schema for database setup
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
