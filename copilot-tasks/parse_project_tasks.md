## Copilot Task: Create GitHub Issues from .github/project_tasks.json

[Action] Parse `.github/project_tasks.json` and for each task: create a github issue

[Metadata] Title level: [Milestone X]: Task Name
All description, success criteria, unit tests will be included in the body of the issue, with label `copilot:task`

Example title:

`[Milestone 2: Core Endpoints] /v1/chat/completions`

Example body:

```md
## Description
Implement the main chat completions endpoint for Cloudflare AI worker.

**Success Criteria** Endpoint returns OpenAI compatible responses and supports multi-provider routing.

[Unit Tests]:
Mocked requests verify correct routing, headers match, model switching.

[Phase]: To Do

```


Please create a generalized github-action script that parses `structure project_tasks.json` and creates one epic Issue per task.