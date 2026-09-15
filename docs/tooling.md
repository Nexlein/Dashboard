# Project Tooling & Automation

## 1. Git Hooks (Husky & lint-staged)

- **Husky**: intercepts Git commands. We use it to catch `git commit`.
- **lint-staged**: runs scripts only on files you are about to commit (staged files).
- **Workflow**: When you commit, Husky triggers lint-staged. Lint-staged runs Prettier to auto-format your code. If it fails, the commit stops.

## 2. Code Formatting (Prettier)

- **Prettier**: Enforces consistent code style (2 spaces, single quotes).
- **.prettierrc**: The rules file.
- **.editorconfig**: Helps your IDE (VSCode, IntelliJ) match Prettier's basic rules instantly while you type.

## 3. GitHub Actions (CI/CD)

- **CI Pipeline (`.github/workflows/ci.yml`)**: Runs `docker-compose build` every time you push to GitHub. Ensures nobody pushes broken code that fails to build.
- **Mirror Pipeline (`.github/workflows/mirror.yml`)**: Automatically pushes your code to the Epitech grading repository when you push to `main`. Requires `GIT_SSH_PRIVATE_KEY` secret in GitHub.

## 4. Docker Compose

- **docker-compose.yml**: Orchestrates the entire app.
    - `client`: React Vite frontend (port 8081).
    - `server`: Express Node.js backend (port 8080).
    - `db`: PostgreSQL 15 database (port 5432).
