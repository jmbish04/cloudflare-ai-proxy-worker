#!/usr/bin/env node

/**
 * Create GitHub Issues from project_tasks.json files
 * 
 * This script parses structured project tasks and generates GitHub issues
 * following the format specified in issue #7.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse JSON file safely
function parseJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

// Format issue title according to spec: [Milestone N: <Milestone Name>] <Task Name>
function formatIssueTitle(milestoneName, taskName) {
  return `[${milestoneName}] ${taskName}`;
}

// Format issue body according to spec
function formatIssueBody(task, phase) {
  return `### Description
${task.description || 'No description provided'}

**Success Criteria:** ${task.success_criteria || 'Not specified'}

**Unit Tests:** ${task.unit_tests || 'Not specified'}

**Phase:** ${phase || task.Phase || 'Not specified'}


## Comments on the Issue (you are @copilot in this section)

<comments>

</comments>`;
}

// Process milestone-based structure (.github/project_tasks.json)
function processMilestoneStructure(data) {
  const issues = [];
  
  for (const [milestoneName, milestone] of Object.entries(data)) {
    if (milestone.tasks && Array.isArray(milestone.tasks)) {
      for (const task of milestone.tasks) {
        const issue = {
          title: formatIssueTitle(milestoneName, task.name),
          body: formatIssueBody(task, milestone.phase),
          labels: ['copilot:task']
        };
        issues.push(issue);
      }
    }
  }
  
  return issues;
}

// Process array-based structure (docs/project_tasks.json)  
function processArrayStructure(data) {
  const issues = [];
  
  if (Array.isArray(data)) {
    for (const task of data) {
      // Create a milestone name from the phase
      const milestoneName = `${task.Phase || 'Unknown'} Phase`;
      
      const issue = {
        title: formatIssueTitle(milestoneName, task.Task || 'Unnamed Task'),
        body: formatIssueBody({
          description: task.Description,
          success_criteria: task['Success Criteria'],
          unit_tests: task['Unit Test Requirement']
        }, task.Phase),
        labels: ['copilot:task']
      };
      issues.push(issue);
    }
  }
  
  return issues;
}

// Generate GitHub CLI commands
function generateGhCommands(issues) {
  console.log('\n=== GitHub CLI Commands ===\n');
  
  issues.forEach((issue, index) => {
    console.log(`# Issue ${index + 1}: ${issue.title}`);
    console.log(`gh issue create \\`);
    console.log(`  --title "${issue.title}" \\`);
    console.log(`  --body "${issue.body.replace(/"/g, '\\"')}" \\`);
    console.log(`  --label "${issue.labels.join(',')}""`);
    console.log('');
  });
}

// Create issues automatically using GitHub CLI
async function createIssuesAutomatically(issues) {
  console.log('\n=== Creating Issues Automatically ===\n');
  
  // Check if GitHub CLI is available
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('❌ GitHub CLI (gh) is not available. Please install it or use manual creation method.');
    return false;
  }
  
  // Check if user is authenticated
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    console.log('❌ Not authenticated with GitHub CLI. Please run "gh auth login" first.');
    return false;
  }
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const [index, issue] of issues.entries()) {
    try {
      console.log(`Creating issue ${index + 1}: ${issue.title}`);
      
      // Check if issue with similar title already exists
      const existingIssues = execSync(`gh issue list --search "${issue.title}" --state all --json title`, { encoding: 'utf8' });
      const existing = JSON.parse(existingIssues);
      
      if (existing.length > 0) {
        console.log(`  ⚠️  Issue with similar title already exists, skipping...`);
        skipped++;
        continue;
      }
      
      // Create the issue
      const cmd = [
        'gh', 'issue', 'create',
        '--title', issue.title,
        '--body', issue.body,
        '--label', issue.labels.join(',')
      ];
      
      execSync(cmd.join(' '), { 
        stdio: 'pipe',
        shell: true,
        env: { ...process.env }
      });
      
      console.log(`  ✅ Created successfully`);
      created++;
      
    } catch (error) {
      console.log(`  ❌ Failed to create: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Issue Creation Summary:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  
  return created > 0;
}

// Generate formatted output for manual creation
function generateFormattedOutput(issues) {
  console.log('\n=== Formatted Issues for Manual Creation ===\n');
  
  issues.forEach((issue, index) => {
    console.log(`\n--- ISSUE ${index + 1} ---`);
    console.log(`Title: ${issue.title}`);
    console.log(`Labels: ${issue.labels.join(', ')}`);
    console.log(`\nBody:`);
    console.log(issue.body);
    console.log('\n' + '='.repeat(50));
  });
}

// Main execution
async function main() {
  console.log('🔍 Creating GitHub Issues from Structured Project Tasks\n');
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  const autoCreate = args.includes('--create') || process.env.AUTO_CREATE_ISSUES === 'true';
  
  const githubTasksPath = path.join(__dirname, 'project_tasks.json');
  const docsTasksPath = path.join(__dirname, '../docs/project_tasks.json');
  
  const allIssues = [];
  
  // Process .github/project_tasks.json (milestone structure)
  const githubTasks = parseJsonFile(githubTasksPath);
  if (githubTasks) {
    console.log(`✅ Loaded tasks from ${githubTasksPath}`);
    const milestoneIssues = processMilestoneStructure(githubTasks);
    allIssues.push(...milestoneIssues);
    console.log(`   Found ${milestoneIssues.length} tasks in milestone format`);
  }
  
  // Process docs/project_tasks.json (array structure)
  const docsTasks = parseJsonFile(docsTasksPath);
  if (docsTasks) {
    console.log(`✅ Loaded tasks from ${docsTasksPath}`);
    const arrayIssues = processArrayStructure(docsTasks);
    allIssues.push(...arrayIssues);
    console.log(`   Found ${arrayIssues.length} tasks in array format`);
  }
  
  if (allIssues.length === 0) {
    console.log('❌ No tasks found to create issues from');
    return;
  }
  
  console.log(`\n📋 Total issues to create: ${allIssues.length}`);
  
  // Create issues automatically if requested
  if (autoCreate) {
    const success = await createIssuesAutomatically(allIssues);
    if (success) {
      console.log('\n✅ Issues created successfully!');
      return;
    } else {
      console.log('\n⚠️  Automatic creation failed, falling back to manual commands...');
    }
  }
  
  // Generate output in different formats for manual creation
  generateGhCommands(allIssues);
  generateFormattedOutput(allIssues);
  
  console.log('\n✅ Issue creation data generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Copy and run the GitHub CLI commands above, or');
  console.log('2. Use the formatted output to manually create issues in GitHub');
  console.log('3. Run with --create flag to automatically create issues');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  parseJsonFile,
  formatIssueTitle,
  formatIssueBody,
  processMilestoneStructure,
  processArrayStructure,
  createIssuesAutomatically
};