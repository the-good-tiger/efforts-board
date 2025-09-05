import json
import os
import re
import sys
from datetime import datetime

def parse_form_data(body):
    """
    Parse the structured form data from GitHub's issue form
    """
    try:
        # First try to parse as JSON if it's a string
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                pass  # Not JSON, continue with string parsing
        
        # Handle both string and pre-parsed JSON
        if isinstance(body, dict):
            # Already parsed as JSON, extract values directly
            parsed_data = {}
            for key, value in body.items():
                if isinstance(value, str):
                    parsed_data[key.lower()] = value
                elif isinstance(value, list) and len(value) > 0:
                    parsed_data[key.lower()] = value[0]
            return parsed_data
        else:
            # String parsing fallback
            if body.startswith('"') and body.endswith('"'):
                body = body[1:-1].replace('\\n', '\n')
            
            parsed_data = {}
            lines = body.split('\n')
            
            current_field = None
            for line in lines:
                if line.startswith('### '):
                    current_field = line.replace('### ', '').strip().lower()
                    parsed_data[current_field] = []
                elif current_field and line.strip() and not line.startswith('#'):
                    parsed_data[current_field].append(line.strip())
            
            # Convert lists to strings
            for key in parsed_data:
                parsed_data[key] = '\n'.join(parsed_data[key]).strip()
                
            return parsed_data
    except Exception as e:
        print(f"Error parsing form data: {e}")
        return {}

def extract_data_from_issue(title, body):
    """
    Extract data from issue title and body with better error handling
    """
    try:
        # Extract date from title
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', title)
        if date_match:
            log_date = date_match.group(1)
        else:
            log_date = datetime.now().strftime("%Y-%m-%d")

        # Parse form data
        form_data = parse_form_data(body)
        
        # Extract values with defaults
        score = int(form_data.get('score', '0'))
        time_spent = int(form_data.get('time spent (minutes)', '0'))
        bounty = int(form_data.get('bounty earned (usd)', '0'))
        notes = form_data.get('notes', '')

        return log_date, score, time_spent, bounty, notes
        
    except Exception as e:
        print(f"Error extracting data: {e}")
        return datetime.now().strftime("%Y-%m-%d"), 0, 0, 0, ''

def main():
    try:
        # Get arguments
        issue_title = sys.argv[1]
        issue_body = sys.argv[2]
        issue_number = sys.argv[3]

        # Extract data
        log_date, score, time_spent, bounty, notes = extract_data_from_issue(
            issue_title, issue_body
        )

        # Create entry
        new_entry = {
            "date": log_date,
            "score": score,
            "time_spent": time_spent,
            "bounty": bounty,
            "notes": notes
        }

        # Read existing data
        try:
            with open('data.json', 'r') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []

        # Update or append entry
        updated = False
        for i, entry in enumerate(data):
            if entry['date'] == log_date:
                data[i] = new_entry
                updated = True
                break
        
        if not updated:
            data.append(new_entry)

        # Write back to file
        with open('data.json', 'w') as f:
            json.dump(data, f, indent=2)

        # Create success comment
        comment = f"✅ Successfully logged entry for {log_date}:\n"
        comment += f"- Score: {score}\n"
        comment += f"- Time Spent: {time_spent} minutes\n"
        comment += f"- Bounty: ${bounty}\n"
        
        if notes:
            comment += f"- Notes: {notes}\n"
        
        # Close issue with comment
        os.system(f'gh issue close {issue_number} --comment "{comment}"')
        
    except Exception as e:
        print(f"Error in main execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
