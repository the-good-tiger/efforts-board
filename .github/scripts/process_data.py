import json
import os
import re
import sys
from datetime import datetime
from github import Github # Make sure 'PyGithub' is in requirements.txt if you use this

# Get arguments from the GitHub Action
issue_title = sys.argv[1]
issue_body = sys.argv[2]
issue_number = int(sys.argv[3])

def extract_data_from_issue(title, body):
    """
    Extracts date, score, time, and bounty from the issue title and body.
    Robust to different title formats.
    """
    # Try to get date from title first, fall back to body, then today.
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', title) or re.search(r'(\d{4}-\d{2}-\d{2})', body)
    if date_match:
        log_date = date_match.group(1)
    else:
        log_date = datetime.now().strftime("%Y-%m-%d") # Final fallback

    # Extract data from the issue body using regex
    score_match = re.search(r"- Score:\s*(\d+)", body)
    time_match = re.search(r"- Time Spent \(minutes\):\s*(\d+)", body)
    bounty_match = re.search(r"- Bounty Earned \(USD\):\s*(\d+)", body)

    score = int(score_match.group(1)) if score_match else 0
    time_spent = int(time_match.group(1)) if time_match else 0
    bounty = int(bounty_match.group(1)) if bounty_match else 0

    # Create a clean, standardized title for storage if needed
    clean_title = f"{log_date} - {score} Points"

    return log_date, score, time_spent, bounty, clean_title

# --- Main Execution ---
log_date, score, time_spent, bounty, clean_title = extract_data_from_issue(issue_title, issue_body)

# Create the new entry
new_entry = {
    "date": log_date,
    "score": score,
    "time_spent": time_spent,
    "bounty": bounty,
    # "notes": "" # You could add notes extraction later
}

# Read the existing data
try:
    with open('data.json', 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    data = [] # Initialize if file doesn't exist

# Check if an entry for this date already exists and update it, else append
found = False
for entry in data:
    if entry['date'] == log_date:
        entry.update(new_entry)
        found = True
        break
if not found:
    data.append(new_entry)

# Write the updated data back to the file
with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

# --- Close the issue with a comment ---
# This uses the GitHub CLI, which is available in the action runner.
comment = f"✅ Successfully logged entry for {log_date}:\n"
comment += f"- Score: {score}\n"
comment += f"- Time Spent: {time_spent} minutes\n"
comment += f"- Bounty: ${bounty}\n\n"
comment += f"View your dashboard: https://yourusername.github.io/your-repo-name/"

# Use the GH CLI to close the issue and add a comment
os.system(f'gh issue close {issue_number} --comment "{comment}"')
