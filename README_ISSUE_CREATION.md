# GitHub Issues from JSON Creator

This repository contains scripts to automatically parse `.github/project_tasks.json` and format GitHub Issues according to the specified requirements.

## Overview

The scripts read structured project tasks from a JSON file and generate properly formatted GitHub Issues with titles and bodies that follow the required template.

## Files

- `create_issues_from_json.js` - Node.js script to parse JSON and format issues
- `create_issues_from_json.py` - Python script (alternative implementation)
- `test_issue_creation.js` - Test suite to validate functionality
- `README.md` - This documentation file

## JSON Structure

The script expects `.github/project_tasks.json` to have this structure:

```json
{
  "Milestone N: Name": {
    "phase": "Phase Name",
    "tasks": [
      {
        "name": "Task Name",
        "description": "Task description",
        "status": "todo|in-progress|done",
        "success_criteria": "Success criteria text",
        "unit_tests": "Unit test description"
      }
    ]
  }
}
```

## Generated Issue Format

### Title Format
```
[Milestone N: <Milestone Name>] <Task Name>
```

### Body Format
```markdown
### Description
<Task description>

**Success Criteria:** <success_criteria>

**Unit Tests:** <unit_tests>

**Phase:** <phase name from milestone>


## Comments on the Issue (you are @copilot in this section)

<comments>

</comments>
```

## Usage

### Option 1: Node.js Script

```bash
# Run the script to see formatted output
node create_issues_from_json.js

# Or make it executable and run directly
chmod +x create_issues_from_json.js
./create_issues_from_json.js
```

### Option 2: Python Script

```bash
# Run the Python version
python3 create_issues_from_json.py

# Or make it executable and run directly
chmod +x create_issues_from_json.py
./create_issues_from_json.py
```

### Option 3: Run Tests

```bash
# Validate the functionality
node test_issue_creation.js
```

## Output

The scripts provide three types of output:

1. **Formatted Display** - Human-readable issue previews
2. **GitHub CLI Commands** - Ready-to-run `gh issue create` commands  
3. **JSON Output** - Structured data for programmatic use

## Creating Issues

### Using GitHub CLI

Copy the `gh issue create` commands from the script output and run them:

```bash
# Example output from script:
gh issue create \
  --title "[Milestone 1: Setup] Timeline Project Initiation" \
  --body "### Description\nStart with a clear definition..."
```

### Using GitHub API

Use the JSON output with the GitHub REST API:

```bash
curl -X POST \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/issues \
  -d '{"title":"[Milestone 1: Setup] Timeline Project Initiation","body":"### Description\n..."}'
```

### Manual Creation

Use the formatted display output to manually create issues through the GitHub web interface.

## Current Project Tasks

Based on the current `.github/project_tasks.json`, the following issues will be created:

1. **[Milestone 1: Setup] Timeline Project Initiation**
   - Phase: Backlog
   - Status: todo

2. **[Milestone 2: Core Endpoints] /v1/chat/completions**
   - Phase: To Do  
   - Status: todo

## Requirements

- Node.js (for .js scripts)
- Python 3 (for .py script)
- GitHub CLI (optional, for creating issues)
- Access to the repository (for creating issues)

## Testing

Run the test suite to validate functionality:

```bash
node test_issue_creation.js
```

The tests verify:
- JSON parsing works correctly
- Expected milestones are present
- Correct number of issues are generated
- Issue formatting follows requirements
- Content matches expected values

## Notes

- The scripts are designed to be safe and only read data - they don't modify files
- Issue creation requires appropriate GitHub permissions
- The JSON structure must match the expected format
- All required fields (name, description, status, success_criteria, unit_tests) must be present