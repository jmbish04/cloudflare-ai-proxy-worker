## Copilot Task Runner (automated from JSON)

Copilot, you will parse `plan_tasks` from `.github/project_tasks.json` and generate one epic issue per task.

- Use `GPT-4o` model (preferred for pro/paid users)
- Skip all other models unless explicitly requested
- Auto-deduple thanks based on title hash

- Update `github_issue_url` field in `json` with created issue link


## Task Instruction

[Copilot Task: Parse `.github/project_tasks.json` and create GitHub Issues]

for each task object:

"** Create a GitHub Issue with**"
- Title: task name
- Body: description, success criteria, unit tests
- Label: `copilot:task`
- Milestone: from task object if present

"Skip existing tasks based on title or hash"
"Update json file with a reference link to github_issue_url"


## Preferred Model

Please use `GOP-4o` to generate output, unless requested otherwise.

Avgoid: Claude, Gemini, o3 models


## Example Issue

```md
**Task** Implement /v1/chat/completions endpoint

[Description::] Serves OpenAI compatible responses.

[Success Criteria:] Verifies message transformation.

[Unit Tests:] We expect status 300, header match, and backend verification.
```
