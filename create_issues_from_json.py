#!/usr/bin/env python3

"""
Script to parse .github/project_tasks.json and format GitHub Issues

This script reads the project tasks JSON file and outputs the formatted
issue data that can be used to create GitHub Issues according to the
specified format requirements.
"""

import json
import os
import sys
from pathlib import Path


def parse_project_tasks(json_path):
    """Parse the project tasks JSON file."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {json_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        sys.exit(1)


def format_issue_title(milestone_key, task_name):
    """Format the GitHub issue title."""
    return f"[{milestone_key}] {task_name}"


def format_issue_body(task, phase):
    """Format the GitHub issue body according to the specified template."""
    return f"""### Description
{task['description']}

**Success Criteria:** {task['success_criteria']}

**Unit Tests:** {task['unit_tests']}

**Phase:** {phase}


## Comments on the Issue (you are @copilot in this section)

<comments>

</comments>"""


def generate_issues_data(project_tasks):
    """Generate issue data from project tasks."""
    issues = []
    
    for milestone_key, milestone_data in project_tasks.items():
        phase = milestone_data['phase']
        tasks = milestone_data['tasks']
        
        for task in tasks:
            issue_data = {
                'title': format_issue_title(milestone_key, task['name']),
                'body': format_issue_body(task, phase),
                'task': task,
                'milestone': milestone_key,
                'phase': phase
            }
            issues.append(issue_data)
    
    return issues


def display_issues(issues):
    """Display formatted issues in a readable format."""
    print('=' * 80)
    print('FORMATTED GITHUB ISSUES FROM PROJECT_TASKS.JSON')
    print('=' * 80)
    print()
    
    for i, issue in enumerate(issues, 1):
        print(f"Issue #{i}")
        print('-' * 40)
        print(f"Title: {issue['title']}")
        print()
        print("Body:")
        print(issue['body'])
        print()
        print("Metadata:")
        print(f"  Milestone: {issue['milestone']}")
        print(f"  Phase: {issue['phase']}")
        print(f"  Status: {issue['task']['status']}")
        print()
        print('=' * 80)
        print()


def generate_github_cli_commands(issues):
    """Generate GitHub CLI commands to create the issues."""
    print('GITHUB CLI COMMANDS TO CREATE ISSUES:')
    print('-' * 40)
    print()
    
    for i, issue in enumerate(issues, 1):
        title = issue['title'].replace('"', '\\"')
        body = issue['body'].replace('"', '\\"').replace('\n', '\\n')
        
        print(f"# Issue {i}: {issue['task']['name']}")
        print("gh issue create \\")
        print(f'  --title "{title}" \\')
        print(f'  --body "{body}"')
        print()


def main():
    """Main function."""
    script_dir = Path(__file__).parent
    json_path = script_dir / '.github' / 'project_tasks.json'
    
    print(f"Reading project tasks from: {json_path}")
    
    if not json_path.exists():
        print(f"Error: File not found: {json_path}")
        sys.exit(1)
    
    project_tasks = parse_project_tasks(json_path)
    issues = generate_issues_data(project_tasks)
    
    print(f"Found {len(issues)} tasks to convert to issues\n")
    
    display_issues(issues)
    generate_github_cli_commands(issues)
    
    # Also output as JSON for programmatic use
    print('JSON OUTPUT:')
    print('-' * 40)
    json_output = [{
        'title': issue['title'],
        'body': issue['body'],
        'milestone': issue['milestone'],
        'phase': issue['phase']
    } for issue in issues]
    
    print(json.dumps(json_output, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()