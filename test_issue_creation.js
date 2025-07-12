#!/usr/bin/env node

/**
 * Test file for the issue creation script
 */

const fs = require('fs');
const path = require('path');
const { 
    parseProjectTasks, 
    formatIssueTitle, 
    formatIssueBody, 
    generateIssuesData 
} = require('./create_issues_from_json.js');

function runTests() {
    console.log('Running tests for issue creation script...\n');
    
    // Test 1: Parse project tasks
    console.log('Test 1: Parse project tasks');
    const jsonPath = path.join(__dirname, '.github', 'project_tasks.json');
    const projectTasks = parseProjectTasks(jsonPath);
    
    if (!projectTasks) {
        console.error('❌ Failed to parse project tasks');
        return false;
    }
    console.log('✅ Successfully parsed project tasks');
    
    // Test 2: Validate JSON structure
    console.log('\nTest 2: Validate JSON structure');
    const milestoneKeys = Object.keys(projectTasks);
    if (milestoneKeys.length !== 2) {
        console.error('❌ Expected 2 milestones, found', milestoneKeys.length);
        return false;
    }
    
    const expectedMilestones = ['Milestone 1: Setup', 'Milestone 2: Core Endpoints'];
    for (const expected of expectedMilestones) {
        if (!milestoneKeys.includes(expected)) {
            console.error('❌ Missing expected milestone:', expected);
            return false;
        }
    }
    console.log('✅ All expected milestones found');
    
    // Test 3: Generate issues data
    console.log('\nTest 3: Generate issues data');
    const issues = generateIssuesData(projectTasks);
    
    if (issues.length !== 2) {
        console.error('❌ Expected 2 issues, generated', issues.length);
        return false;
    }
    console.log('✅ Generated correct number of issues');
    
    // Test 4: Validate issue formatting
    console.log('\nTest 4: Validate issue formatting');
    const firstIssue = issues[0];
    
    if (!firstIssue.title.includes('[Milestone 1: Setup]')) {
        console.error('❌ First issue title format incorrect');
        return false;
    }
    
    if (!firstIssue.body.includes('### Description')) {
        console.error('❌ Issue body missing Description header');
        return false;
    }
    
    if (!firstIssue.body.includes('**Success Criteria:**')) {
        console.error('❌ Issue body missing Success Criteria');
        return false;
    }
    
    if (!firstIssue.body.includes('**Unit Tests:**')) {
        console.error('❌ Issue body missing Unit Tests');
        return false;
    }
    
    if (!firstIssue.body.includes('**Phase:**')) {
        console.error('❌ Issue body missing Phase');
        return false;
    }
    
    console.log('✅ Issue formatting is correct');
    
    // Test 5: Validate specific content
    console.log('\nTest 5: Validate specific content');
    const titles = issues.map(issue => issue.title);
    const expectedTitles = [
        '[Milestone 1: Setup] Timeline Project Initiation',
        '[Milestone 2: Core Endpoints] /v1/chat/completions'
    ];
    
    for (let i = 0; i < expectedTitles.length; i++) {
        if (titles[i] !== expectedTitles[i]) {
            console.error('❌ Title mismatch. Expected:', expectedTitles[i], 'Got:', titles[i]);
            return false;
        }
    }
    console.log('✅ All titles match expected format');
    
    console.log('\n🎉 All tests passed!');
    return true;
}

function displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('ISSUE CREATION SUMMARY');
    console.log('='.repeat(60));
    
    const jsonPath = path.join(__dirname, '.github', 'project_tasks.json');
    const projectTasks = parseProjectTasks(jsonPath);
    const issues = generateIssuesData(projectTasks);
    
    console.log(`\nTotal milestones: ${Object.keys(projectTasks).length}`);
    console.log(`Total tasks to convert: ${issues.length}`);
    console.log('\nIssues to be created:');
    
    issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.title}`);
        console.log(`     Phase: ${issue.phase}`);
        console.log(`     Status: ${issue.task.status}`);
    });
    
    console.log('\nNext steps:');
    console.log('1. Run: node create_issues_from_json.js');
    console.log('2. Copy the GitHub CLI commands and run them, or');
    console.log('3. Use the JSON output to create issues via GitHub API');
}

if (require.main === module) {
    const testsPass = runTests();
    if (testsPass) {
        displaySummary();
    }
}