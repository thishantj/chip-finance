## Table of Contents

- [Vision UI Dashboard Free React](https://demos.creative-tim.com/vision-ui-dashboard-react/?ref=readme-vudreact)
- [Table of Contents](#table-of-contents)
- [Documentation](#documentation)
- [File Structure](#file-structure)

## Preparation

1. Download and Install NodeJs 16 from the [official website](https://nodejs.org/en/about/previous-releases) or use [nvm](https://github.com/nvm-sh/nvm) to quickly switch versions.
2. Navigate to the `frontend` directory (`cd frontend`) and run `yarn install` or `npm install`.
3. Navigate to the `backend` directory (`cd ../backend`) and run `npm install` (or `yarn install`).

## Documentation

The documentation for the Vision UI Dashboard Free is hosted at our [website](https://www.creative-tim.com/learning-lab/react/overview/vision-ui-dashboard/?ref=readme-vudreact).

## File Structure

Within the project you'll find the following directories and files:

```
micro-finance/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── config/         # Example: Database config
│   ├── server.js       # Example: Main server file
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── apple-icon.png
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── theme/
│   │   │       ├── base/
│   │   │       ├── components/
│   │   │       ├── functions/
│   │   │       ├── index.js
│   │   │       └── theme-rtl.js
│   │   ├── components/ # Reusable Vui components
│   │   ├── context/
│   │   ├── examples/   # Vision UI specific example components
│   │   ├── layouts/    # Page layouts (Dashboard, Billing, Profile, etc.)
│   │   ├── variables/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── routes.js
│   ├── .eslintrc.json
│   ├── .gitignore
│   ├── .prettierrc.json
│   ├── jsconfig.json
│   ├── package.json
│   └── README.md      # Frontend specific README (if any)
├── .gitignore         # Root gitignore
├── README.md          # Main project README
└── schema.sql         # Database schema
```
