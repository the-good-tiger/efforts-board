import json
import os
import re
import sys
import urllib.parse
from datetime import datetime

def parse_issue_body(body):
    """
    Parse the issue body from the YAML form format.
    The body comes as a string of key-value pairs that we need to parse.
    """
    # The body comes in a format like: 
    # "### Score\n\n22\n\n### Time Spent (minutes)\n\n180\n\n### Bounty Earned (USD)\n\n0\n\n### Notes\n\nSome notes here"
    # We need to extract the values after each header
    
    parsed_data = {}
    
    # Split by markdown headers (###)
    sections = re.split(r'### ', body)
    
    for section in sections:
        if not section.strip():
            continue
            
        # Split each section into header and content
        lines = section.split('\n', 1)
        if len(lines) < 2:
            continue
            
        header = lines[0].strip()
        content = lines[1].strip()
        
        # Clean up the content by removing extra whitespace
        content = re.sub(r'\n+', ' ', content)
        content = content.strip()
        
        # Map headers to field names
        if header == 'Score':
            parsed_data['score'] = content
        elif header == 'Time Spent (minutes)':
            parsed_data['time_spent'] = content
        elif header == 'Bounty Earned (USD)':
            parsed_data['bounty'] = content
        elif header == 'Notes':
            parsed_data['notes'] = content
    
    return parsed_data

def extract_data_from_issue(title, body):
    """
    Extracts date, score, time, and bounty from the issue title and body.
    """
    # Extract date from title (format: "Daily Log - 2024-05-24")
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', title)
    if date_match:
        log_date = date_match.group(1)
    else:
        log_date = datetime.now().strftime("%Y-%m-%d")  # Fallback to today

    # Parse the form data from the body
    form_data = parse_issue_body(body)
    
    # Extract values with defaults
    score = int(form_data.get('score', 0))
    time_spent = int(form_data.get('time_spent', 0))
    bounty = int(form_data.get('bounty', 0))
    notes = form_data.get('notes', '')

    # Create a clean, standardized title for storage if needed
    clean_title = f"{log_date} - {score} Points"

    return log_date, score, time_spent, bounty, notes, clean_title

# --- Main Execution ---
if __name__ == "__main__":
    # Get arguments from the GitHub Action
    issue_title = sys.argv[1]
    issue_body = sys.argv[2]
    issue_number = int(sys.argv[3])

    log_date, score, time_spent, bounty, notes, clean_title = extract_data_from_issue(issue_title, issue_body)

    # Create the new entry
    new_entry = {
        "date": log_date,
        "score": score,
        "time_spent": time_spent,
        "bounty": bounty,
        "notes": notes
    }

    # Read the existing data
    try:
        with open('data.json', 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []  # Initialize if file doesn't exist or is invalid

    # Check if an entry for this date already exists and update it, else append
    found = False
    for i, entry in enumerate(data):
        if entry['date'] == log_date:
            data[i] = new_entry  # Replace the entire entry
            found = True
            break
            
    if not found:
        data.append(new_entry)

    # Write the updated data back to the file
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)

    # --- Close the issue with a comment ---
    comment = f"✅ Successfully logged entry for {log_date}:\n"
    comment += f"- Score: {score}\n"
    comment += f"- Time Spent: {time_spent} minutes\n"
    comment += f"- Bounty: ${bounty}\n"
    if notes:
        comment += f"- Notes: {notes}\n"
    comment += f"\nView your dashboard: https://{os.environ.get('GITHUB_REPOSITORY', '').split('/')[0]}.github.io/{os.environ.get('GITHUB_REPOSITORY', '').split('/')[1]}/"

    # Use the GH CLI to close the issue and add a comment
    os.system(f'gh issue close {issue_number} --comment "{comment}"')
