#!/usr/bin/env node

/**
 * Script to parse .github/project_tasks.json and format GitHub Issues
 * 
 * This script reads the project tasks JSON file and outputs the formatted
 * issue data that can be used to create GitHub Issues according to the
 * specified format requirements.
 */

const fs = require('fs');
const path = require('path');

function parseProjectTasks(jsonPath) {
    try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading or parsing JSON file:', error.message);
        process.exit(1);
    }
}

function formatIssueTitle(milestoneKey, taskName) {
    return `[${milestoneKey}] ${taskName}`;
}

function formatIssueBody(task, phase) {
    return `### Description
${task.description}

**Success Criteria:** ${task.success_criteria}

**Unit Tests:** ${task.unit_tests}

**Phase:** ${phase}


## Comments on the Issue (you are @copilot in this section)

<comments>

</comments>`;
}

function generateIssuesData(projectTasks) {
    const issues = [];
    
    for (const [milestoneKey, milestoneData] of Object.entries(projectTasks)) {
        const { phase, tasks } = milestoneData;
        
        for (const task of tasks) {
            const issueData = {
                title: formatIssueTitle(milestoneKey, task.name),
                body: formatIssueBody(task, phase),
                task: task,
                milestone: milestoneKey,
                phase: phase
            };
            issues.push(issueData);
        }
    }
    
    return issues;
}

function displayIssues(issues) {
    console.log('='.repeat(80));
    console.log('FORMATTED GITHUB ISSUES FROM PROJECT_TASKS.JSON');
    console.log('='.repeat(80));
    console.log();
    
    issues.forEach((issue, index) => {
        console.log(`Issue #${index + 1}`);
        console.log('-'.repeat(40));
        console.log(`Title: ${issue.title}`);
        console.log();
        console.log('Body:');
        console.log(issue.body);
        console.log();
        console.log('Metadata:');
        console.log(`  Milestone: ${issue.milestone}`);
        console.log(`  Phase: ${issue.phase}`);
        console.log(`  Status: ${issue.task.status}`);
        console.log();
        console.log('='.repeat(80));
        console.log();
    });
}

function generateGitHubCLICommands(issues) {
    console.log('GITHUB CLI COMMANDS TO CREATE ISSUES:');
    console.log('-'.repeat(40));
    console.log();
    
    issues.forEach((issue, index) => {
        const escapedTitle = issue.title.replace(/"/g, '\\"');
        const escapedBody = issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        
        console.log(`# Issue ${index + 1}: ${issue.task.name}`);
        console.log(`gh issue create \\`);
        console.log(`  --title "${escapedTitle}" \\`);
        console.log(`  --body "${escapedBody}"`);
        console.log();
    });
}

function main() {
    const jsonPath = path.join(__dirname, '.github', 'project_tasks.json');
    
    console.log(`Reading project tasks from: ${jsonPath}`);
    
    if (!fs.existsSync(jsonPath)) {
        console.error(`Error: File not found: ${jsonPath}`);
        process.exit(1);
    }
    
    const projectTasks = parseProjectTasks(jsonPath);
    const issues = generateIssuesData(projectTasks);
    
    console.log(`Found ${issues.length} tasks to convert to issues\n`);
    
    displayIssues(issues);
    generateGitHubCLICommands(issues);
    
    // Also output as JSON for programmatic use
    console.log('JSON OUTPUT:');
    console.log('-'.repeat(40));
    console.log(JSON.stringify(issues.map(issue => ({
        title: issue.title,
        body: issue.body,
        milestone: issue.milestone,
        phase: issue.phase
    })), null, 2));
}

if (require.main === module) {
    main();
}

module.exports = {
    parseProjectTasks,
    formatIssueTitle,
    formatIssueBody,
    generateIssuesData
};