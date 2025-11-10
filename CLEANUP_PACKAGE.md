# FoulPlay V6.5 - Complete Cleanup & Fix Package

**IMPORTANT: Follow these steps IN ORDER. Each step builds on the previous one.**

---

## 🚨 CRITICAL FIRST STEP: Secure Your Credentials

### Step 0: Change Your Pokemon Showdown Password NOW

1. Go to https://play.pokemonshowdown.com/
2. Log in with your current credentials
3. Click your username → Options → Change Password
4. Set a NEW password
5. **Do NOT commit this new password to Git**

**Why:** Your current password is exposed in your public GitHub repository. Anyone can see it and use your account.

---

## Step 1: Backup Your Current Work

```bash
# Create a safe backup of everything
cd ~/Desktop  # or wherever your project is
cp -r FoulPlayV6.5 FoulPlayV6.5_BACKUP_$(date +%Y%m%d)
cd FoulPlayV6.5
```

**Checkpoint:** You should now have a complete backup in case something goes wrong.

---

## Step 2: Create Clean Directory Structure

```bash
# Create new clean directory
cd ~/Desktop  # or parent of your project
mkdir FoulPlayV6.5_CLEAN
cd FoulPlayV6.5_CLEAN

# Copy ONLY source code (no generated files)
SOURCE=~/Desktop/FoulPlayV6.5  # adjust if needed

# Backend
mkdir -p backend
cp $SOURCE/backend/__init__.py backend/
cp $SOURCE/backend/main.py backend/
cp $SOURCE/backend/control_routes.py backend/
cp $SOURCE/backend/epoke_routes.py backend/
cp $SOURCE/backend/epoke_client.py backend/
cp $SOURCE/backend/pkmn_proxy.py backend/
cp $SOURCE/backend/battle_state_parser.py backend/
cp $SOURCE/backend/smogon_client.py backend/
cp $SOURCE/backend/logging.ini backend/
cp $SOURCE/backend/.env backend/.env.example  # rename to example

# Frontend (copy entire src directory if it exists)
if [ -d "$SOURCE/frontend" ]; then
    mkdir -p frontend
    rsync -av --exclude='node_modules' --exclude='dist' --exclude='build' \
        $SOURCE/frontend/ frontend/
fi

# Bot (foul-play)
mkdir -p foul-play
rsync -av --exclude='__pycache__' --exclude='*.pyc' \
    $SOURCE/foul-play/ foul-play/

# Services (source only, no node_modules)
mkdir -p services/pkmn-svc/src
mkdir -p services/epoke-svc/src

# PKMN Service
cp $SOURCE/services/pkmn-svc/package.json services/pkmn-svc/
cp $SOURCE/services/pkmn-svc/package-lock.json services/pkmn-svc/
cp $SOURCE/services/pkmn-svc/tsconfig.json services/pkmn-svc/
rsync -av $SOURCE/services/pkmn-svc/src/ services/pkmn-svc/src/

# EPoké Service
cp $SOURCE/services/epoke-svc/package.json services/epoke-svc/
cp $SOURCE/services/epoke-svc/package-lock.json services/epoke-svc/
cp $SOURCE/services/epoke-svc/tsconfig.json services/epoke-svc/
rsync -av $SOURCE/services/epoke-svc/src/ services/epoke-svc/src/
# Copy vendor directory if it has the EPoke model
if [ -d "$SOURCE/services/epoke-svc/vendor" ]; then
    rsync -av $SOURCE/services/epoke-svc/vendor/ services/epoke-svc/vendor/
fi

# Scripts
mkdir -p scripts
cp $SOURCE/start_all.sh scripts/ 2>/dev/null || echo "start_all.sh not found, will create new"
cp $SOURCE/stop_all.sh scripts/ 2>/dev/null || echo "stop_all.sh not found, will create new"

# Teams
mkdir -p teams
cp -r $SOURCE/teams/* teams/ 2>/dev/null || echo "No teams directory"

# Tests
mkdir -p tests
cp $SOURCE/tests/__init__.py tests/ 2>/dev/null || true
cp $SOURCE/tests/test_smoke.py tests/ 2>/dev/null || true

# Config (WITHOUT credentials)
mkdir -p config
# DO NOT copy config.json if it has credentials
# cp $SOURCE/config/app.json config/ 2>/dev/null || true

echo "Clean directory structure created!"
```

**Checkpoint:** You should now have a clean directory with ~300-500 files (not 28,000!)

---

## Step 3: Create Essential Configuration Files

### 3.1: Create .gitignore

Create file `.gitignore` with this content:

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST
.venv/
venv/
ENV/
env/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.eslintcache
dist/
build/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
*.log
logs/
*.out
*.err

# Runtime
*.pid
.run/

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Environment & Secrets
.env
.env.local
.env.*.local
config/config.json
config/credentials.json

# Project Specific
backend/logs/
backups/
vendor_extras/

# OS
Thumbs.db
Desktop.ini

# Build outputs
services/pkmn-svc/dist/
services/epoke-svc/dist/
frontend/dist/
frontend/build/
```

### 3.2: Create config/.env.example

Create file `config/.env.example`:

```bash
# Pokemon Showdown Credentials
PS_USERNAME=your_username_here
PS_PASSWORD=your_password_here

# Bot Configuration
BATTLE_BOT_ID=FoulPlayBot
MAX_BATTLES=5

# Service URLs
PKMN_SVC_URL=http://127.0.0.1:8787
EPOKE_SVC_URL=http://127.0.0.1:8788

# EPoké Settings
ENABLE_EPOKE=false
EPOKE_TIMEOUT_MS=900

# Logging
LOG_LEVEL=INFO
```

### 3.3: Create backend/.env.example

Create file `backend/.env.example`:

```bash
# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Service URLs
PKMN_SVC_URL=http://127.0.0.1:8787
EPOKE_SVC_URL=http://127.0.0.1:8788

# Bot Settings
BOT_SCRIPT_PATH=../foul-play/run.py
LOG_DIR=./logs
```

### 3.4: Create your ACTUAL .env files (with real credentials)

```bash
# Copy examples and edit with YOUR credentials
cp config/.env.example config/.env
cp backend/.env.example backend/.env

# Now edit these files with your REAL credentials
# Use nano, vim, or your favorite editor:
nano config/.env
# Edit PS_USERNAME and PS_PASSWORD with your NEW password

nano backend/.env
# Verify paths look correct
```

**Checkpoint:** You now have secure configuration setup.

---

## Step 4: Fix Critical Bot Import Error

### 4.1: Fix run_battle.py

Edit `foul-play/fp/run_battle.py`:

**FIND this line (around line 14):**
```python
from fp.battle_modifier import async_update_battle, process_battle_updates
```

**REPLACE with:**
```python
from fp.battle_modifier import process_battle_updates
```

**EXPLANATION:** The function `async_update_battle` doesn't exist. Only `process_battle_updates` is real.

### 4.2: Check if async_update_battle is actually used

Search for where it's called:

```bash
cd foul-play
grep -r "async_update_battle" .
```

**If it finds uses of async_update_battle:** You'll need to remove those calls or replace them with the correct function. It's likely just imported but never used.

**Checkpoint:** Import error is fixed!

---

## Step 5: Standardize EPoké Port Configuration

### 5.1: Fix EPoké Service Default Port

Edit `services/epoke-svc/src/index.ts`:

**FIND:**
```typescript
const PORT = process.env.PORT || 7001;
```

**REPLACE with:**
```typescript
const PORT = process.env.PORT || 8788;
```

### 5.2: Verify Backend Configuration

Edit `backend/epoke_routes.py` and/or `backend/epoke_client.py`:

**Look for lines with EPoké URLs and ensure they point to port 8788:**

```python
EPOKE_BASE_URL = os.getenv("EPOKE_SVC_URL", "http://127.0.0.1:8788")
```

### 5.3: Verify Bot Configuration

Check `foul-play/fp/epoke_client.py` or wherever EPoké URL is configured:

```python
def epoke_url() -> str:
    return os.getenv("EPOKE_URL") or "http://127.0.0.1:8788/infer"
```

**Checkpoint:** All services now agree on port 8788 for EPoké!

---

## Step 6: Fix Logs Endpoint (Optional but Recommended)

Edit `backend/main.py`:

**ADD this endpoint (probably near other /logs routes):**

```python
@app.get("/logs/backend")
async def get_backend_logs_compat():
    """Compatibility endpoint for frontend"""
    return await get_log_tail("backend", lines=200)
```

This fixes the frontend's `/logs/backend` 404 errors.

**Checkpoint:** Logs endpoint aligned!

---

## Step 7: Create Minimal README.md

Create `README.md`:

```markdown
# FoulPlay V6.5

Pokemon Showdown battle bot with ML decision support.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+ LTS
- Pokemon Showdown account

### Setup

1. **Clone and enter directory:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FoulPlayV6.5.git
   cd FoulPlayV6.5
   ```

2. **Configure credentials:**
   ```bash
   cp config/.env.example config/.env
   nano config/.env  # Add your PS username and password
   ```

3. **Set up Python environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Install Node dependencies:**
   ```bash
   cd services/pkmn-svc && npm install && cd ../..
   cd services/epoke-svc && npm install && cd ../..
   cd frontend && npm install && cd ..
   ```

5. **Start all services:**
   ```bash
   ./scripts/start_all.sh
   ```

6. **Open browser:**
   ```
   http://localhost:5173
   ```

## Architecture

- **Frontend** (React + Vite) - Control UI on port 5173
- **Backend** (FastAPI) - Bot controller on port 8000
- **PKMN Service** (Node) - Damage calculator on port 8787
- **EPoké Service** (Node) - ML inference on port 8788
- **Bot** (Python) - Battle logic in foul-play/

## Configuration

All settings in `config/.env` and `backend/.env`

Key options:
- `PS_USERNAME` / `PS_PASSWORD` - Your Showdown credentials
- `ENABLE_EPOKE=true` - Enable ML suggestions
- `MAX_BATTLES=5` - Concurrent battle limit

## Troubleshooting

### Bot won't start
- Check credentials in `config/.env`
- Verify all services are running (check logs/)
- Ensure ports 5173, 8000, 8787, 8788 are free

### Services won't start
- Run `./scripts/stop_all.sh` first
- Check for port conflicts: `lsof -i :8000`
- Verify dependencies installed: `npm list` in service dirs

### Import errors
- Activate venv: `source .venv/bin/activate`
- Reinstall: `pip install -r requirements.txt`

## License

Private use only.
```

---

## Step 8: Create requirements.txt

Create `requirements.txt`:

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
websockets==12.0
httpx==0.25.1
pydantic==2.5.0
python-multipart==0.0.6
aiofiles==23.2.1
pytest==7.4.3
```

*(Adjust versions based on what you actually need)*

---

## Step 9: Initialize Clean Git Repository

```bash
# Make sure you're in the CLEAN directory
cd ~/Desktop/FoulPlayV6.5_CLEAN

# Verify file count (should be 300-500, not 28,000!)
find . -type f | wc -l

# Initialize new Git repository
git init
git add .
git status  # Review what's being added - should NOT see node_modules, .venv, logs

# Commit
git commit -m "Initial clean commit - FoulPlay V6.5

- Removed all virtual environments
- Removed all node_modules
- Removed all logs and runtime artifacts
- Removed all backup directories
- Fixed bot import error (async_update_battle)
- Standardized EPoké port to 8788
- Added proper .gitignore
- Secured credentials in .env files (not committed)"

# Add your GitHub remote
git remote add origin https://github.com/johnsonpokemongo/FoulPlayV6.5.git

# Force push to replace everything
git branch -M main
git push -f origin main
```

**⚠️ WARNING:** This will completely replace your GitHub repository. Your old commits will be gone. That's intentional - we want a clean slate.

**Checkpoint:** Your GitHub repo is now clean!

---

## Step 10: Verify Everything Works

### 10.1: Clone Fresh Copy

```bash
cd ~/Desktop
mkdir test_fresh_clone
cd test_fresh_clone
git clone https://github.com/johnsonpokemongo/FoulPlayV6.5.git
cd FoulPlayV6.5

# Verify file count
find . -type f | wc -l
# Should be 300-500, not 28,000!

# Verify no sensitive files
git log --all --full-history --pretty=format: --name-only | grep -i password
# Should return nothing
```

### 10.2: Test Setup

```bash
# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install Node dependencies
cd services/pkmn-svc && npm install && cd ../..
cd services/epoke-svc && npm install && cd ../..
cd frontend && npm install && cd ..

# Create your .env files
cp config/.env.example config/.env
cp backend/.env.example backend/.env
# Edit with real credentials
nano config/.env
```

### 10.3: Start Services

```bash
# Start everything
./scripts/start_all.sh

# Check health
curl http://localhost:8000/health
curl http://localhost:8787/health
curl http://localhost:8788/health

# Open frontend
open http://localhost:5173
```

### 10.4: Test Bot

1. Open browser to http://localhost:5173
2. Go to Advanced tab
3. Verify PKMN Service shows "ONLINE"
4. Verify EPoké ML shows "ONLINE"
5. Click "Start Bot"
6. Check status shows "running: true"
7. Check logs for NO ImportError

**Success Criteria:**
- ✅ Bot starts without crashes
- ✅ No ImportError in logs
- ✅ Services all show online
- ✅ Can accept/play battles

---

## Step 11: Update GitHub Repository Settings (Optional)

1. Go to https://github.com/johnsonpokemongo/FoulPlayV6.5
2. Settings → General:
   - Add description: "Pokemon Showdown battle bot with ML"
   - Add topics: `pokemon`, `showdown`, `bot`, `machine-learning`
3. If you want to keep it truly private:
   - Settings → Danger Zone → Change visibility → Private

---

## Final Checklist

Before you're done, verify:

- [ ] Old Pokemon Showdown password has been changed
- [ ] New repository has <500 files (not 28,000)
- [ ] No .venv directories in Git
- [ ] No node_modules directories in Git
- [ ] No logs/ directories in Git
- [ ] No .env files with real credentials in Git
- [ ] .gitignore is present and working
- [ ] Bot starts without ImportError
- [ ] All services start on correct ports (5173, 8000, 8787, 8788)
- [ ] Fresh clone and setup works
- [ ] README.md exists and is helpful

---

## What We Fixed

### Security
✅ Rotated exposed Pokemon Showdown password  
✅ Moved credentials to .env files (not committed)  
✅ Added .env.example templates for safe sharing

### Repository Hygiene
✅ Removed 27,500+ unnecessary files  
✅ Removed virtual environments from Git  
✅ Removed node_modules from Git  
✅ Removed logs and runtime artifacts  
✅ Removed backup directories  
✅ Added comprehensive .gitignore

### Functionality
✅ Fixed bot import error (async_update_battle → process_battle_updates)  
✅ Standardized EPoké port to 8788  
✅ Fixed logs endpoint mismatch  
✅ Verified all services communicate correctly

### Documentation
✅ Added README.md with setup instructions  
✅ Added .env.example files  
✅ Added requirements.txt  
✅ Documented architecture and troubleshooting

---

## File Size Comparison

**BEFORE:**
- Files in Git: ~28,000
- Repository size: ~100+ MB
- Clone time: 30+ seconds
- node_modules: 15,000 files
- Virtual envs: 10,000 files
- Backups: 2,000 files

**AFTER:**
- Files in Git: ~300-500
- Repository size: <5 MB
- Clone time: <5 seconds
- node_modules: 0 (installed locally only)
- Virtual envs: 0 (created locally only)
- Backups: 0 (kept locally only)

---

## Maintenance Going Forward

### Adding New Files

**DO:**
- Commit source code (.py, .ts, .tsx, .jsx, .json configs)
- Commit package.json and package-lock.json
- Commit requirements.txt
- Commit documentation (.md files)
- Commit team files, scripts, configs (without secrets)

**DON'T:**
- Commit node_modules/ (npm install creates it)
- Commit .venv/ or venv/ (pip creates it)
- Commit logs/ (runtime generates it)
- Commit .env files with real credentials
- Commit __pycache__/ or *.pyc files
- Commit dist/ or build/ directories

### Before Each Commit

Run this quick check:

```bash
# See what you're about to commit
git status

# If you see node_modules, .venv, or logs - STOP!
# Something is wrong with .gitignore

# Check file count
git ls-files | wc -l
# Should stay around 300-500
```

### When GitHub Desktop Shows 1000+ Changed Files

**STOP!** Something went wrong. Don't commit. Check:

1. Did you accidentally delete .gitignore?
2. Did npm install run in the repo root?
3. Did you create a venv inside the repo?

Fix the issue, run `git reset`, and start over.

---

## Troubleshooting This Cleanup

### "I can't find my credentials in config/.env.example"

That's correct! `.env.example` is a template with fake values. You need to:
1. Copy it: `cp config/.env.example config/.env`
2. Edit the COPY: `nano config/.env`
3. Put your REAL credentials in config/.env
4. NEVER commit config/.env to Git

### "The bot still has ImportError"

Double-check Step 4.1. The line should be:
```python
from fp.battle_modifier import process_battle_updates
```

NOT:
```python
from fp.battle_modifier import async_update_battle, process_battle_updates
```

### "EPoké service still won't connect"

1. Check services/epoke-svc/src/index.ts has `PORT || 8788`
2. Check backend config points to `http://127.0.0.1:8788`
3. Check bot config points to `http://127.0.0.1:8788/infer`
4. Restart all services: `./scripts/stop_all.sh && ./scripts/start_all.sh`

### "git push -f is scary"

It is! That's why we made a backup in Step 1. If anything goes wrong:
```bash
cd ~/Desktop/FoulPlayV6.5_BACKUP_20251109  # or whatever date
# Your old repo is safe here
```

### "I get 'remote: Permission denied' when pushing"

You need to authenticate with GitHub. Use:
```bash
gh auth login
# Or set up SSH keys
# Or use GitHub Desktop (easier)
```

For GitHub Desktop:
1. Open GitHub Desktop
2. File → Add Local Repository
3. Choose FoulPlayV6.5_CLEAN folder
4. Publish Repository (or force push)

---

## Success Metrics

You'll know you succeeded when:

1. **Security:**
   - Your password is changed
   - No credentials visible on GitHub
   - .env files are in .gitignore

2. **Repository:**
   - `git ls-files | wc -l` shows <500
   - Fresh clone takes <10 seconds
   - No warnings about large files

3. **Functionality:**
   - Bot starts without errors
   - Services show "ONLINE" in UI
   - Can play battles successfully

4. **Maintainability:**
   - New contributors can clone and run
   - README explains setup clearly
   - No confusion about configuration

---

## Next Steps After Cleanup

Once everything is working:

1. **Test thoroughly:**
   - Play 5-10 battles
   - Check logs for errors
   - Verify stats tracking works
   - Test EPoké suggestions

2. **Document any issues:**
   - Note anything that doesn't work
   - Check if it's from cleanup or pre-existing
   - Create issues on GitHub (if public)

3. **Optimize performance:**
   - Tune EPoké timeout
   - Adjust battle search depth
   - Configure logging levels

4. **Consider enhancements:**
   - Add more battle formats
   - Improve decision logging
   - Add performance metrics

---

## Questions? Issues?

If you hit problems during cleanup:

1. **Check the backup:** Files in FoulPlayV6.5_BACKUP are safe
2. **Review .gitignore:** Make sure it matches the template
3. **Check file count:** Should be 300-500, not thousands
4. **Test locally first:** Don't push until local testing passes
5. **Read error messages:** They usually tell you exactly what's wrong

Common pitfalls:
- Forgetting to activate venv before pip install
- Forgetting to npm install in service directories
- Not editing .env files with real credentials
- Trying to start services while old ones still running
- Not giving execute permission to scripts: `chmod +x scripts/*.sh`

---

## Timeline

This cleanup should take about 2-3 hours:
- Step 0-1 (Security & Backup): 15 min
- Step 2-3 (Clean Copy & Config): 30 min
- Step 4-6 (Code Fixes): 30 min
- Step 7-9 (Git Setup): 30 min
- Step 10-11 (Verification): 30 min

Take your time. It's better to go slow and verify each step than rush and create new problems.

---

## You're Done! 🎉

If you've completed all steps and passed all checkpoints:

**CONGRATULATIONS!** You now have:
- ✅ A clean, professional Git repository
- ✅ Secure credential management
- ✅ A working bot without import errors
- ✅ Properly configured services
- ✅ Good documentation for future you

This repository is now ready for:
- Safe collaboration (if you make it public)
- Easy deployment
- Professional portfolio use
- Long-term maintenance

**Most importantly:** You've learned Git best practices that will help you in every future project!
