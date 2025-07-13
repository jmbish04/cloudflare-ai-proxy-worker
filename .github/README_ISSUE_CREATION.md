# GitHub Issue Creation from Structured Tasks

This directory contains complete tooling to automatically parse structured project tasks from JSON files and create properly formatted GitHub Issues.

## 📁 Files

| File | Purpose |
|------|---------|
| `create_issues_from_json.js` | Main script to parse JSON and generate issue data |
| `test_issue_creation.js` | Test suite to validate functionality |
| `show_solution_summary.js` | Displays solution overview and demo |
| `workflows/create-issues.yml` | GitHub Actions workflow for automation |

## 🎯 Purpose

Solves the requirement from issue #6 to "publish remaining structured tasks as individual GitHub issues" by:

1. Parsing structured task data from `project_tasks.json` files
2. Generating GitHub issues with proper formatting
3. Following the specified title and body structure
4. Adding appropriate labels and metadata

## 📋 Input Sources

The tool processes two JSON file formats:

### 1. Milestone Structure (`.github/project_tasks.json`)
```json
{
  "Milestone 1: Setup": {
    "phase": "Backlog",
    "tasks": [
      {
        "name": "Task Name",
        "description": "Task description",
        "status": "todo", 
        "success_criteria": "Success criteria",
        "unit_tests": "Unit test requirements"
      }
    ]
  }
}
```

### 2. Array Structure (`docs/project_tasks.json`)
```json
[
  {
    "Phase": "Planning",
    "Task": "Task Name",
    "Description": "Task description", 
    "Success Criteria": "Success criteria",
    "Unit Test Requirement": "Unit test requirements"
  }
]
```

## 📝 Output Format

### Issue Title
```
[Milestone Name] Task Name
```

### Issue Body
```markdown
### Description
Task description here

**Success Criteria:** Success criteria details

**Unit Tests:** Unit test requirements

**Phase:** Phase name

## Comments on the Issue (you are @copilot in this section)

<comments>

</comments>
```

### Labels
- `copilot:task`

## 🚀 Usage

### Option 1: GitHub CLI (Recommended)
```bash
# Generate commands
node .github/create_issues_from_json.js

# Copy and run the generated gh commands
gh issue create --title "[Milestone 1: Setup] Timeline Project Initiation" --body "..." --label "copilot:task"
```

### Option 2: GitHub Actions (Automated)
The workflow in `workflows/create-issues.yml` automatically runs when:
- `project_tasks.json` files are modified
- Manually triggered via `workflow_dispatch`

### Option 3: Manual Creation
Use the formatted output from the script to manually create issues in the GitHub UI.

## 🧪 Testing

Run the test suite to validate functionality:
```bash
node .github/test_issue_creation.js
```

## 📊 Current Tasks

The tool currently identifies **13 structured tasks** ready for issue creation:

**Original Tasks (4):**
1. **[Milestone 1: Setup] Timeline Project Initiation** (Phase: Backlog)
2. **[Milestone 2: Core Endpoints] /v1/chat/completions** (Phase: To Do)  
3. **[Planning Phase] Define project scope and requirements** (Phase: Planning)
4. **[Setup Phase] Initialize Cloudflare Worker project** (Phase: Setup)

**Gemini PR #3 Review Fixes (9):**
5. **[Milestone 3: Gemini PR #3 Review Fixes] Token Estimation Enhancement** (Phase: In Progress)
6. **[Milestone 3: Gemini PR #3 Review Fixes] Security - API Key Header Migration** (Phase: In Progress)
7. **[Milestone 3: Gemini PR #3 Review Fixes] Add Missing Endpoint Tests** (Phase: In Progress)
8. **[Milestone 3: Gemini PR #3 Review Fixes] Replace Invalid HTML Endpoints** (Phase: In Progress)
9. **[Milestone 3: Gemini PR #3 Review Fixes] Improve Bash Script Robustness** (Phase: In Progress)
10. **[Milestone 3: Gemini PR #3 Review Fixes] Fix Bash USER Variable** (Phase: In Progress)
11. **[Milestone 3: Gemini PR #3 Review Fixes] Improve Model Detection Logic** (Phase: In Progress)
12. **[Milestone 3: Gemini PR #3 Review Fixes] TypeScript Type Safety** (Phase: In Progress)
13. **[Milestone 3: Gemini PR #3 Review Fixes] Standardize System Prompts** (Phase: In Progress)

## 💡 Example Output

The script generates both GitHub CLI commands and formatted text for easy copying:

```bash
gh issue create \
  --title "[Milestone 1: Setup] Timeline Project Initiation" \
  --body "### Description..." \
  --label "copilot:task"
```

## ✅ Validation

All functionality is tested and validated:
- JSON parsing for both file formats
- Title and body formatting
- Label assignment  
- File existence checks
- End-to-end workflow

This implementation fully addresses the requirement to publish remaining structured tasks as individual GitHub issues as requested in PR #3.