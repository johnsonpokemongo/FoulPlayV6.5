# FoulPlay V6.5 - Quick Reference Checklist

**Print this or keep it open in a second window while you work through CLEANUP_PACKAGE.md**

---

## ✅ Pre-Flight Checklist

- [ ] I have changed my Pokemon Showdown password at play.pokemonshowdown.com
- [ ] I have created a backup: `FoulPlayV6.5_BACKUP_20251109`
- [ ] I am working in a NEW directory: `FoulPlayV6.5_CLEAN`
- [ ] I have the CLEANUP_PACKAGE.md file open for detailed instructions

---

## ✅ Directory Creation (Step 2)

- [ ] Created backend/ with .py files only
- [ ] Created frontend/ (no node_modules)
- [ ] Created foul-play/ bot code
- [ ] Created services/pkmn-svc/src/
- [ ] Created services/epoke-svc/src/
- [ ] Created scripts/
- [ ] Created teams/
- [ ] Created tests/
- [ ] Created config/
- [ ] File count check: `find . -type f | wc -l` shows ~300-500 (not 28,000)

---

## ✅ Configuration Files (Step 3)

- [ ] Created .gitignore (from template in CLEANUP_PACKAGE)
- [ ] Created config/.env.example
- [ ] Created backend/.env.example
- [ ] Created config/.env with REAL credentials (not committed)
- [ ] Created backend/.env with REAL paths (not committed)
- [ ] Verified: `git status` does NOT show .env files

---

## ✅ Code Fixes (Steps 4-6)

### Bot Import Fix (Step 4)
- [ ] Edited foul-play/fp/run_battle.py
- [ ] Changed: `from fp.battle_modifier import process_battle_updates`
- [ ] Removed: `, async_update_battle` from import line
- [ ] Searched for uses: `grep -r "async_update_battle" foul-play/`
- [ ] Confirmed: Only found in import (or removed calls if found)

### EPoké Port Fix (Step 5)
- [ ] Edited services/epoke-svc/src/index.ts
- [ ] Changed default port to: `process.env.PORT || 8788`
- [ ] Verified backend/epoke_client.py points to port 8788
- [ ] Verified foul-play/fp/epoke_client.py points to port 8788

### Logs Fix (Step 6)
- [ ] Added `/logs/backend` endpoint to backend/main.py
- [ ] Or confirmed existing logs endpoints match frontend calls

---

## ✅ Documentation (Steps 7-8)

- [ ] Created README.md at root
- [ ] Created requirements.txt with dependencies
- [ ] Verified both files contain actual content (not just placeholders)

---

## ✅ Git Repository (Step 9)

- [ ] Ran: `git init`
- [ ] Ran: `git add .`
- [ ] Checked: `git status` shows ~300-500 files
- [ ] Confirmed: NO node_modules in git status
- [ ] Confirmed: NO .venv in git status
- [ ] Confirmed: NO logs/ in git status
- [ ] Ran: `git commit -m "Initial clean commit..."`
- [ ] Added remote: `git remote add origin https://github.com/johnsonpokemongo/FoulPlayV6.5.git`
- [ ] Force pushed: `git push -f origin main`

---

## ✅ Verification (Step 10)

### Fresh Clone Test
- [ ] Cloned repo to new directory
- [ ] File count: `find . -type f | wc -l` is ~300-500
- [ ] No passwords in history: `git log --all --full-history | grep -i password` returns nothing

### Setup Test
- [ ] Created venv: `python3 -m venv .venv`
- [ ] Activated: `source .venv/bin/activate`
- [ ] Installed Python deps: `pip install -r requirements.txt`
- [ ] Installed Node deps in services/pkmn-svc: `npm install`
- [ ] Installed Node deps in services/epoke-svc: `npm install`
- [ ] Installed Node deps in frontend: `npm install`
- [ ] Created real .env files from examples
- [ ] All npm installs completed without errors

### Service Test
- [ ] Started all services: `./scripts/start_all.sh`
- [ ] Backend health: `curl http://localhost:8000/health` returns 200
- [ ] PKMN health: `curl http://localhost:8787/health` returns 200
- [ ] EPoké health: `curl http://localhost:8788/health` returns 200
- [ ] Frontend loads: Open `http://localhost:5173` in browser

### Bot Test
- [ ] Opened frontend: http://localhost:5173
- [ ] Advanced tab shows PKMN Service: ONLINE (green)
- [ ] Advanced tab shows EPoké ML: ONLINE (green)
- [ ] Clicked "Start Bot" button
- [ ] Status shows "running: true" with a PID
- [ ] Checked logs/bot/bot.log - NO ImportError present
- [ ] Checked logs/backend.log - NO 404 errors for /logs/backend
- [ ] Bot can accept and play a battle

---

## ✅ Final Verification

- [ ] GitHub repository shows <500 files
- [ ] GitHub repository size is <10 MB
- [ ] No .env files visible on GitHub
- [ ] No node_modules visible on GitHub
- [ ] No .venv directories visible on GitHub
- [ ] README.md displays correctly on GitHub
- [ ] Repository is set to Private (if desired)

---

## 🚨 Red Flags (STOP if you see these)

**During `git status` before commit:**
- ❌ Shows "node_modules/" - Your .gitignore is wrong or missing
- ❌ Shows ".venv/" or "venv/" - Your .gitignore is wrong
- ❌ Shows "backend/.venv/" - Didn't remove second venv
- ❌ Shows "logs/" directories - Your .gitignore is wrong
- ❌ Shows "config/.env" or "backend/.env" - These should be ignored
- ❌ Shows 10,000+ files to commit - Something went very wrong

**During verification:**
- ❌ Bot crashes with ImportError - Import fix wasn't applied correctly
- ❌ EPoké shows OFFLINE - Port standardization didn't work
- ❌ 404 errors in backend logs - Logs endpoint fix missing
- ❌ Can't clone fresh repo - Push didn't work or repo is corrupted

**On GitHub:**
- ❌ See "config.json" with username/password - SECURITY BREACH!
- ❌ See ".env" files - These should be ignored
- ❌ Repo shows 1000+ files - Cleanup didn't work
- ❌ Repo is 50+ MB - Didn't remove node_modules/venv

**If ANY red flag appears: STOP, review CLEANUP_PACKAGE.md for that step, and fix it before continuing.**

---

## 📊 Success Metrics

### Repository Health
- Total files: 300-500 ✅
- Repository size: <10 MB ✅
- Clone time: <10 seconds ✅
- No secrets exposed: ✅

### Functionality
- Bot starts without errors: ✅
- All services online: ✅
- Can play battles: ✅
- Logs accessible: ✅

### Maintainability
- Fresh clone works: ✅
- Setup documented: ✅
- Configuration clear: ✅
- No confusion: ✅

---

## 🎯 Quick Commands Reference

### File Count Check
```bash
find . -type f | wc -l
```
**Expected: 300-500 for clean repo**

### Git File Count Check
```bash
git ls-files | wc -l
```
**Expected: 300-500 for clean repo**

### Search for Secrets
```bash
git log --all --full-history --pretty=format: --name-only | grep -i password
git log --all --full-history --pretty=format: --name-only | grep ".env"
```
**Expected: Empty output (no results)**

### Service Health Checks
```bash
curl http://localhost:8000/health  # Backend
curl http://localhost:8787/health  # PKMN
curl http://localhost:8788/health  # EPoké
```
**Expected: All return 200 OK**

### Check What's Running
```bash
lsof -i :8000  # Backend
lsof -i :8787  # PKMN
lsof -i :8788  # EPoké
lsof -i :5173  # Frontend
```
**Expected: All show running processes**

### Kill All Services
```bash
./scripts/stop_all.sh
# Or manual:
pkill -f "uvicorn"
pkill -f "node.*pkmn-svc"
pkill -f "node.*epoke-svc"
pkill -f "vite"
pkill -f "run.py"
```

### Check Bot Logs for Errors
```bash
tail -50 logs/bot/bot.log | grep -i error
tail -50 logs/backend.log | grep -i error
```
**Expected: No ImportError, no EPoké connection errors**

---

## 🔄 If You Need to Start Over

Something went wrong and you want to restart from scratch:

```bash
# 1. Go back to your backup
cd ~/Desktop
rm -rf FoulPlayV6.5_CLEAN  # Delete failed attempt

# 2. Start again from Step 2 in CLEANUP_PACKAGE.md
mkdir FoulPlayV6.5_CLEAN
cd FoulPlayV6.5_CLEAN
# ... follow steps again
```

Your original backup at `FoulPlayV6.5_BACKUP_20251109` is always safe.

---

## 📞 Stuck? Check These First

### "Bot won't start"
1. Activated venv? `source .venv/bin/activate`
2. Installed deps? `pip install -r requirements.txt`
3. Created .env? `ls config/.env` should exist
4. Valid credentials in .env?
5. Services running? Check health endpoints

### "Service shows OFFLINE"
1. Service actually running? `lsof -i :PORT`
2. Correct port? (PKMN=8787, EPoké=8788)
3. Node deps installed? `ls node_modules` in service dir
4. Check service logs in logs/ directory

### "Git won't push"
1. Added remote? `git remote -v` shows origin
2. On main branch? `git branch` shows * main
3. Committed? `git log` shows commit
4. GitHub auth? Try `gh auth login` or GitHub Desktop

### "Import error persists"
1. Check actual file: `cat foul-play/fp/run_battle.py | grep async_update_battle`
2. Should return NOTHING
3. If it returns something, edit wasn't saved
4. Re-do Step 4.1

---

## 🎓 What You Learned

By completing this cleanup, you now understand:

- ✅ **Git best practices**: What to commit, what to ignore
- ✅ **Security**: How to keep credentials out of version control
- ✅ **.gitignore**: How to prevent future mistakes
- ✅ **Repository hygiene**: Keeping repos small and clean
- ✅ **Service configuration**: Port management and environment variables
- ✅ **Debugging**: Systematic approach to fixing import errors
- ✅ **Python environments**: Why venvs shouldn't be in Git
- ✅ **Node dependencies**: Why node_modules shouldn't be in Git

These lessons apply to EVERY future project!

---

## 💾 Save This Checklist

This checklist is a reference you can use for:
- Tracking progress during cleanup
- Verifying each step completed
- Quick reference for commands
- Troubleshooting common issues
- Future projects (as a template)

**Keep it handy while you work through CLEANUP_PACKAGE.md**

---

**Ready? Start with CLEANUP_PACKAGE.md Step 0 (Change your password!)**

Good luck! You've got this! 🚀
