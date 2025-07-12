#!/usr/bin/env node

/**
 * Quick GitHub CLI Commands Generator
 * 
 * Run this to get the exact commands needed to create the GitHub issues
 */

const { 
  parseJsonFile, 
  processMilestoneStructure, 
  processArrayStructure 
} = require('./create_issues_from_json.js');

const path = require('path');

function generateQuickCommands() {
  console.log('🚀 GitHub CLI Commands to Create Issues from Structured Tasks\n');
  
  const githubTasksPath = path.join(__dirname, 'project_tasks.json');
  const docsTasksPath = path.join(__dirname, '../docs/project_tasks.json');
  
  const allIssues = [];
  
  // Process both files
  const githubTasks = parseJsonFile(githubTasksPath);
  if (githubTasks) {
    const milestoneIssues = processMilestoneStructure(githubTasks);
    allIssues.push(...milestoneIssues);
  }
  
  const docsTasks = parseJsonFile(docsTasksPath);
  if (docsTasks) {
    const arrayIssues = processArrayStructure(docsTasks);
    allIssues.push(...arrayIssues);
  }
  
  console.log(`📋 Creating ${allIssues.length} GitHub Issues:\n`);
  
  // Generate clean commands
  allIssues.forEach((issue, index) => {
    console.log(`# ${index + 1}. ${issue.title}`);
    console.log(`gh issue create --title "${issue.title}" --body '${issue.body}' --label "${issue.labels.join(',')}"`)
    console.log('');
  });
  
  console.log('Copy and paste each command above to create the issues! 🎉');
}

if (require.main === module) {
  generateQuickCommands();
}

module.exports = { generateQuickCommands };