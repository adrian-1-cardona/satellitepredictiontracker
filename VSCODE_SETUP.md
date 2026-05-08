# 🚀 Complete VSCode & Local Development Setup

## 📦 Prerequisites (Install First)

### macOS
```bash
# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python 3.11+
brew install python@3.11

# PostgreSQL
brew install postgresql@15

# Redis
brew install redis

# Docker
brew install --cask docker

# Git
brew install git
```

### Windows
```powershell
# Chocolatey (run PowerShell as Admin)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Python 3.11+
choco install python311

# PostgreSQL
choco install postgresql

# Redis (or use WSL)
choco install redis

# Docker Desktop
choco install docker-desktop

# Git
choco install git
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv postgresql postgresql-contrib redis-server docker.io git

# Add user to docker group
sudo usermod -aG docker $USER
```

---

## 🎯 One-Time Setup (Do This First)

### 1. Install VSCode

Download from https://code.visualstudio.com

### 2. Clone the Project

```bash
git clone <your-repo-url>
cd satellite-tracker
```

### 3. Create Virtual Environment

```bash
# Create venv
python3.11 -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

**Your terminal should now show `(venv)` prefix.**

### 4. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Install VSCode Extensions

Open VSCode command palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)

Type and install each:
```
ext install ms-python.python
ext install ms-python.vscode-pylance
ext install mtxr.sqltools
ext install mtxr.sqltools-driver-pg
ext install humao.rest-client
ext install ms-azuretools.vscode-docker
```

### 6. Setup PostgreSQL

#### macOS (with Homebrew)
```bash
# Start PostgreSQL service
brew services start postgresql@15

# Create database & user
createuser -P tracker
# Enter password: tracker_dev_password

createdb -O tracker satellite_tracker
```

#### Windows (with Installer)
```powershell
# PostgreSQL service should auto-start
# Open pgAdmin (http://localhost:5050)
# Or use Command Prompt:
psql -U postgres
```

Then in psql:
```sql
CREATE USER tracker WITH PASSWORD 'tracker_dev_password';
CREATE DATABASE satellite_tracker OWNER tracker;
```

#### Linux
```bash
sudo -u postgres psql

# In psql:
CREATE USER tracker WITH PASSWORD 'tracker_dev_password';
CREATE DATABASE satellite_tracker OWNER tracker;
\q
```

### 7. Run Database Migrations

```bash
alembic upgrade head
```

**Verify**: You should see "Running migration" messages.

### 8. Start Redis

#### macOS
```bash
brew services start redis
# Check: redis-cli ping → should return "PONG"
```

#### Windows (WSL recommended)
```bash
# In WSL terminal
wsl
redis-server
```

#### Linux
```bash
sudo systemctl start redis-server
redis-cli ping  # Should return PONG
```

### 9. Copy .env File

```bash
cp .env.example .env
```

**Edit `.env` with your values** (usually defaults work for local dev):
```
DATABASE_URL=postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker
SECRET_KEY=dev-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
```

---

## 🏃 Daily Development Workflow

### Open Project in VSCode

```bash
cd satellite-tracker
code .
```

VSCode should automatically detect `.vscode/settings.json` and use your virtual environment.

### Terminal 1: Start API Server

```bash
# Make sure (venv) is active
python -m uvicorn app.main:app --reload
```

**Output should show**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

Visit http://localhost:8000/docs to see API documentation

### Terminal 2: Start Celery Worker

```bash
# New terminal, activate venv first
source venv/bin/activate  # or venv\Scripts\activate on Windows

celery -A app.tasks celery_app worker --loglevel=info
```

**Output should show**:
```
Connected to redis://localhost:6379
Starting worker
```

### Terminal 3: Start Celery Beat (Scheduler)

```bash
# New terminal, activate venv first
source venv/bin/activate

celery -A app.tasks celery_app beat --loglevel=info
```

**Now you have**:
- ✅ API running on http://localhost:8000
- ✅ Celery workers processing jobs
- ✅ Celery beat scheduling periodic jobs
- ✅ PostgreSQL storing data
- ✅ Redis queuing jobs

---

## 🐳 Alternative: Use Docker Compose (Easier!)

Instead of all the above, just:

```bash
docker-compose up -d
```

This starts everything:
- PostgreSQL ✅
- Redis ✅
- API ✅
- Celery worker ✅
- Celery beat ✅
- PgAdmin (database browser) ✅

Check: `docker-compose ps` should show all services running.

---

## 🔌 Connect to Database in VSCode

### Using SQLTools Extension

1. Open Command Palette: `Cmd+Shift+P`
2. Type: `SQLTools: Add New Connection`
3. Choose: PostgreSQL
4. Fill in:
   ```
   Host: localhost
   Port: 5432
   Database: satellite_tracker
   Username: tracker
   Password: tracker_dev_password
   ```
5. Test connection
6. Save

Now you can:
- Browse tables in the sidebar
- Run SQL queries
- View data visually

### Using Terminal (psql)

```bash
psql postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker
```

Then:
```sql
SELECT * FROM users;
SELECT * FROM locations;
SELECT COUNT(*) FROM passes;
```

---

## 🧪 Running Tests in VSCode

### Option 1: Using Test Explorer

1. Open `tests/test_satellites.py`
2. VSCode should detect tests
3. Click "Run Test" above each test
4. View results in side panel

### Option 2: Command Palette

```
Cmd+Shift+P → Python: Run Tests
```

### Option 3: Terminal

```bash
pytest tests/ -v
```

**View coverage**:
```bash
pytest tests/ --cov=app --cov-report=html
# Then open htmlcov/index.html in browser
```

---

## 🐛 Debugging in VSCode

### Debug API Server

1. Open `.vscode/launch.json` (should be there)
2. Click **Run and Debug** sidebar
3. Select **"Python: FastAPI"**
4. Press `F5` to start debugging
5. Set breakpoints by clicking line numbers
6. Requests will pause at breakpoints

### Debug Tests

1. Open test file
2. Click **Run and Debug** sidebar
3. Select **"Python: Pytest"**
4. Press `F5`
5. Tests run with full debugger

### Debug Celery Worker

1. Click **Run and Debug** sidebar
2. Select **"Python: Celery Worker"**
3. Press `F5`
4. Worker starts with debugger attached

---

## 📱 API Testing in VSCode

### Using REST Client Extension

Create `test.http` file:

```http
### Register User
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}

### Login
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}

### Create Location (replace TOKEN with actual token from login)
POST http://localhost:8000/api/v1/locations
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": "New York City",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "elevation_m": 10
}

### List Passes
GET http://localhost:8000/api/v1/passes?location_id=1&days_ahead=12
Authorization: Bearer TOKEN
```

Then:
1. Click "Send Request" above any request
2. View response in split pane
3. Response is syntax-highlighted JSON

---

## 🚀 VSCode Useful Shortcuts

```
Cmd+P / Ctrl+P           → Quick file open
Cmd+Shift+P / Ctrl+Shift+P → Command palette
F5                       → Start debugging
Shift+F5                 → Stop debugging
F10                      → Step over (debug)
F11                      → Step into (debug)
Shift+F11                → Step out (debug)
Ctrl+` (backtick)        → Toggle terminal
Cmd+K Cmd+W / Ctrl+Shift+W → Close editor
Ctrl+G                   → Go to line number
Cmd+/ / Ctrl+/           → Toggle comment
```

---

## 🔗 Port Reference

Make sure these ports are available:

| Service | Port | URL |
|---------|------|-----|
| FastAPI | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |
| PgAdmin | 5050 | http://localhost:5050 (Docker only) |

**If a port is in use**:
```bash
# macOS/Linux: Find what's using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>

# Windows: Find what's using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 🎯 Common Issues & Solutions

### "ModuleNotFoundError: No module named 'app'"

**Solution**: Ensure virtual environment is activated
```bash
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
```

### "psycopg2: connection refused"

**Solution**: PostgreSQL isn't running
```bash
brew services start postgresql@15    # macOS
sudo systemctl start postgresql      # Linux
# Windows: Start PostgreSQL from Services
```

### "ConnectionRefusedError: [Errno 111] Connection refused (Redis)"

**Solution**: Redis isn't running
```bash
brew services start redis            # macOS
sudo systemctl start redis-server    # Linux
redis-server                         # Windows/WSL
```

### "Address already in use" (port 8000)

**Solution**: Another process is using the port
```bash
# Kill it
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
python -m uvicorn app.main:app --reload --port 8001
```

### "Cannot find Python interpreter"

**Solution**: VSCode can't find your venv
1. Open Command Palette: `Cmd+Shift+P`
2. Type: `Python: Select Interpreter`
3. Choose: `./venv/bin/python`

### Tests not discovered

**Solution**: Set pytest as default test runner
1. Command Palette: `Cmd+Shift+P`
2. Type: `Python: Configure Tests`
3. Choose: `pytest`
4. Choose: `tests/` as test folder

---

## 📚 Useful VSCode Extensions (Optional)

```
- Thunder Client (alternative to Postman)
- Thunder Client: https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client

- GitLens (better git integration)
- GitLens: https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens

- GitHub Copilot (AI assistance)
- Copilot: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot

- Error Lens (inline error display)
- ErrorLens: https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens

- Better Comments (color code comments)
- Better Comments: https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments
```

---

## 🔑 Accounts You Need

### Optional (Nice to Have)

| Service | Cost | Why |
|---------|------|-----|
| **GitHub** | Free | Version control (already using if repo is there) |
| **Sentry** | Free tier | Error monitoring in production |
| **Heroku** | Free tier | Easy deployment option |
| **AWS** | Free tier (12 months) | Production deployment |
| **DataDog** | Free tier | Monitoring & logs |

### None Required for Local Development!

You can run everything locally without any accounts. All services (PostgreSQL, Redis, etc.) run on your machine.

---

## ✅ Final Checklist

Before you start coding, verify:

- [ ] Python 3.11+ installed: `python --version`
- [ ] Virtual env created and activated: `which python` shows `.venv/`
- [ ] Dependencies installed: `pip list` shows all packages
- [ ] PostgreSQL running: `psql --version` works
- [ ] Redis running: `redis-cli ping` returns `PONG`
- [ ] VSCode extensions installed: Check Extensions sidebar
- [ ] `.vscode/settings.json` exists
- [ ] `.vscode/launch.json` exists
- [ ] `.env` file created with values
- [ ] Database migrations ran: `alembic upgrade head` completed
- [ ] API starts: `python -m uvicorn app.main:app --reload` works
- [ ] API docs load: http://localhost:8000/docs opens

**When all are ✅, you're ready to code!**

---

## 🚀 Next Steps

1. **Activate VSCode**: Open the project folder in VSCode
2. **Start services**: Follow the development workflow above
3. **Explore API**: Visit http://localhost:8000/docs
4. **Run tests**: `pytest tests/ -v`
5. **Make code changes**: VSCode auto-saves, server auto-reloads
6. **Commit to Git**: `git add . && git commit -m "feature: add thing"`

---

**You're all set! Happy coding!** 🎉

Questions? Check the main README.md or GETTING_STARTED.md
