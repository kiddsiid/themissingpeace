@echo off
REM ── The Missing Peace → GitHub ──────────────────────────────────────────────
REM Double-click me. Commits everything (secrets are .gitignored) and pushes to
REM a private GitHub repo. Needs GitHub CLI the first time: winget install GitHub.cli
cd /d "%~dp0"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo Initializing git repository...
  git init
)

echo.
echo Staging and committing...
git add -A
git commit -m "The Missing Peace — full build through session 17 (seating studio, guest surfaces, printables)" || echo (nothing new to commit)

git remote get-url origin >nul 2>&1
if not errorlevel 1 goto push

where gh >nul 2>&1
if errorlevel 1 (
  echo.
  echo GitHub CLI not found. Two options:
  echo   1^) Install it:  winget install GitHub.cli   then run me again, or
  echo   2^) Create a repo at https://github.com/new  then run:
  echo        git remote add origin https://github.com/YOUR-USERNAME/the-missing-peace.git
  echo        git push -u origin main
  pause
  exit /b 1
)

gh auth status >nul 2>&1
if errorlevel 1 (
  echo Signing in to GitHub...
  gh auth login
)

echo Creating private repo "the-missing-peace" and pushing...
gh repo create the-missing-peace --private --source=. --push
goto done

:push
echo Pushing to existing remote...
git push -u origin HEAD

:done
echo.
echo ✦ Done. Next: open DEPLOY.md for the Cloudflare steps (goodbye, localhost).
pause
