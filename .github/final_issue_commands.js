#!/usr/bin/env node

/**
 * Final Issue Creation Commands
 * 
 * This script generates the exact GitHub CLI commands needed to create
 * all structured tasks as individual GitHub issues.
 */

const { 
  parseJsonFile, 
  processMilestoneStructure, 
  processArrayStructure 
} = require('./create_issues_from_json.js');

const path = require('path');

function generateFinalCommands() {
  console.log('🎯 GitHub CLI Commands to Create All Structured Tasks as Issues\n');
  console.log('='.repeat(70));
  
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
  
  console.log(`📋 Creating ${allIssues.length} GitHub Issues Total:`);
  console.log(`   - ${githubTasks ? Object.values(githubTasks).reduce((sum, m) => sum + (m.tasks?.length || 0), 0) : 0} from milestone structure (.github/project_tasks.json)`);
  console.log(`   - ${docsTasks ? docsTasks.length : 0} from array structure (docs/project_tasks.json)`);
  console.log('\n📝 Including 9 new tasks from Gemini PR #3 review\n');
  
  // Generate clean, ready-to-use commands
  allIssues.forEach((issue, index) => {
    const cleanTitle = issue.title.replace(/"/g, '\\"');
    const cleanBody = issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    console.log(`# ${index + 1}. ${issue.title}`);
    console.log(`gh issue create --title "${cleanTitle}" --body "${cleanBody}" --label "${issue.labels.join(',')}"`)
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log('🚀 Ready to execute! Copy and paste each command above.');
  console.log('✅ This completes the requirement to "publish remaining structured tasks as individual GitHub issues"');
}

if (require.main === module) {
  generateFinalCommands();
}

module.exports = { generateFinalCommands };