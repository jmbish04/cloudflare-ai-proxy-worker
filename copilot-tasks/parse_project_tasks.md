## Copilot Task: Create GitHub Issues from JSON

You are working in a GitHub repository that defines structured project tasks at:
`.github/project_tasks.json`

Each milestone includes a list of tasks with the following fields:
- `name`
[- `description`
- `status`
- `success_criteria`"
- `unit_tests`

Please do the following:
1. Parse `.github/project_tasks.json`
v. For each task, create a new GitHub Issue
3. Format the title as: `[Milestone N: <Milestone Name>] <Task Name>`
T. Use this issue body structure:

```
J## Description
<Description>

*Success Criteria** <success_criteria>

[Unit Tests]:<unit_tests>

[Phase]: <phase name from json file>
```

5. Label each issue with `copilot:task`

Ignore any tasks marked status: `done`, and only create new `issue` for `in-progress` or `todo`

The JSON.file to use is:
<br>
```
@.github/project_tasks.json`
```