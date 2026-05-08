# ⚡ Quick Answer: VSCode Setup & Accounts

## 🔴 TL;DR - What You Need (5 minutes)

### Software to Install (FREE)
```
1. VSCode                 → https://code.visualstudio.com
2. Python 3.11+          → https://python.org (or brew/apt)
3. PostgreSQL            → https://postgresql.org
4. Redis                 → https://redis.io
5. Docker (optional)     → https://docker.com
6. Git                   → https://git-scm.com
```

### VSCode Extensions (Click Install in VSCode)
```
1. Python               (Microsoft)
2. Pylance             (Microsoft)
3. SQLTools            (mtxr)
4. SQLTools PostgreSQL (mtxr)
5. REST Client         (Huachao Mao)
6. Docker              (Microsoft)
```

### Accounts You Need
```
👉 NONE FOR LOCAL DEVELOPMENT
```

**That's it.** No GitHub, no AWS, no Heroku needed to start coding locally.

---

## 🚀 Get Running in 10 Minutes

### Step 1: Install Software (5 min)

**macOS**:
```bash
brew install python@3.11 postgresql@15 redis
```

**Windows**: Download installers from python.org, postgresql.org, redis-windows

**Linux (Ubuntu)**:
```bash
sudo apt install python3.11 postgresql redis-server
```

### Step 2: Clone & Setup (3 min)

```bash
git clone <repo-url>
cd satellite-tracker
python -m venv venv
source venv/bin/activate      # macOS/Linux: source
# or on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3: Start Services (2 min)

```bash
# Terminal 1
python -m uvicorn app.main:app --reload
# Visit http://localhost:8000/docs

# Terminal 2 (new terminal, activate venv again)
celery -A app.tasks celery_app worker --loglevel=info

# Terminal 3 (optional, for scheduling)
celery -A app.tasks celery_app beat --loglevel=info
```

✅ **You're done!**

---

## 📝 What Gets Pre-Configured

When you download the project, I've already created:

### `.vscode/settings.json`
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.formatting.provider": "black",
  "[python]": {
    "editor.formatOnSave": true
  }
}
```
👉 **What it does**: Auto-formats your code, uses right Python interpreter

### `.vscode/launch.json`
```json
{
  "configurations": [
    {
      "name": "Python: FastAPI",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload"]
    }
  ]
}
```
👉 **What it does**: Click `F5` to debug the API directly in VSCode

### `.env.example`
```
DATABASE_URL=postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker
SECRET_KEY=dev-secret-key-change-in-production
```
👉 **What it does**: Copy to `.env`, configuration is ready to go

---

## 🎯 Extension Quick Setup

Open VSCode, press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows), type each:

```
Python              ← Essential
Pylance             ← For better type hints
SQLTools            ← Browse database
SQLTools PostgreSQL ← Database driver
REST Client         ← Test API endpoints
Docker              ← Docker integration
```

Done. That's all.

---

## 🔌 Database Without Manual Setup

**Option A: Use Docker Compose** (Easiest)
```bash
docker-compose up -d
# Everything runs: PostgreSQL ✅ Redis ✅ API ✅ Workers ✅
```

**Option B: Manual Setup** (10 minutes)
```bash
# Start PostgreSQL (should auto-start with installer)
psql postgres
# In psql:
CREATE USER tracker WITH PASSWORD 'tracker_dev_password';
CREATE DATABASE satellite_tracker OWNER tracker;
\q

# Start Redis
redis-server  # macOS/Linux
# Windows: Use WSL or pre-built exe

# Run migrations
alembic upgrade head
```

---

## 📦 NO Accounts Needed For:

✅ Local development
✅ Running the API
✅ Testing
✅ Database access
✅ Writing code
✅ Everything in this project

---

## 🌐 Optional Accounts (For Production Only)

Only sign up if you plan to deploy:

| Service | For | Cost | When |
|---------|-----|------|------|
| GitHub | Version control | Free | Now (if deploying) |
| Heroku | Easy deployment | Free tier exists | When deploying |
| AWS | Production hosting | Free tier (12 months) | Production |
| Sentry | Error tracking | Free tier | Production monitoring |

**You can ignore these while learning.**

---

## ✅ Your Actual Checklist

```
☐ Install: Python, PostgreSQL, Redis, VSCode, Git
☐ Open VSCode
☐ Install 5 extensions
☐ Clone repo
☐ Create venv: python -m venv venv
☐ Activate: source venv/bin/activate
☐ Install deps: pip install -r requirements.txt
☐ Copy .env: cp .env.example .env
☐ Migrate DB: alembic upgrade head
☐ Start API: python -m uvicorn app.main:app --reload
☐ Visit http://localhost:8000/docs
✅ Done!
```

---

## 🆘 One Issue You Might Hit

**"I can't connect to PostgreSQL"**

Solution:
```bash
# Check if PostgreSQL is running
psql postgres

# If error, start it:
brew services start postgresql@15    # macOS
sudo systemctl start postgresql      # Linux
# Windows: Use Services app or installer

# Then try connecting:
psql postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker
```

If you get `psql: connection refused`, PostgreSQL isn't running.

---

## 📚 See Also

For detailed setup: `VSCODE_SETUP.md` (in your outputs folder)

For full project: `README.md`

For quick start: `GETTING_STARTED.md`

---

## 🎉 That's Really It

No hidden complexity. No account signing. No sketchy services.

Just:
1. Install software
2. Install VSCode extensions  
3. Clone repo
4. Run setup commands
5. Start coding

**Everything you need is in the output files.**

Happy coding! 🚀
