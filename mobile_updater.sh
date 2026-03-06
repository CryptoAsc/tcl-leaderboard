#!/bin/bash

# Termux/Linux Mobile continuous updater script
# Make sure to run this inside the cloned repository directory.

echo "============================================="
echo "Starting TCL Leaderboard mobile updater..."
echo "Press Ctrl+C to stop."
echo "============================================="

# Ensure basic git config is set so commits don't fail on a fresh clone
git config --global user.name 'mobile-updater'
git config --global user.email 'mobile-updater@localhost'

POLL_INTERVAL=30

while true; do
  echo "--- Poll at $(date) ---"
  
  # Fetch data and update discord (if DISCORD_WEBHOOK_URL is set in env)
  python3 scripts/fetch_data.py
  python3 scripts/discord_webhook.py
  
  git add docs/data/
  if ! git diff --quiet || ! git diff --staged --quiet; then
    echo "Changes detected, committing and pushing..."
    git commit -m "Auto-update leaderboard data (Mobile)"
    
    # Robust pull to avoid conflicts if GitHub Action is running simultaneously
    if ! git pull --rebase origin main; then
      echo "Git rebase conflict detected! Resetting to remote main..."
      git rebase --abort
      git reset --hard origin/main
      echo "Skipping push for this cycle."
    else
      git push origin main
    fi
  else
    echo "No changes."
  fi
  
  sleep $POLL_INTERVAL
done
