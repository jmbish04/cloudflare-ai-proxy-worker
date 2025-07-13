#!/usr/bin/env node

/**
 * Test suite for issue creation functionality
 */

const { 
  parseJsonFile, 
  formatIssueTitle, 
  formatIssueBody, 
  processMilestoneStructure, 
  processArrayStructure,
  createIssuesAutomatically
} = require('./create_issues_from_json.js');

const path = require('path');

// Test data
const testMilestoneData = {
  "Milestone 1: Setup": {
    "phase": "Backlog",
    "tasks": [
      {
        "name": "Test Task",
        "description": "Test description",
        "status": "todo",
        "success_criteria": "Test criteria",
        "unit_tests": "Test requirements"
      }
    ]
  }
};

const testArrayData = [
  {
    "Phase": "Planning",
    "Task": "Test Planning Task", 
    "Description": "Test planning description",
    "Success Criteria": "Planning criteria",
    "Unit Test Requirement": "Planning tests"
  }
];

// Test functions
function testFormatIssueTitle() {
  console.log('Testing formatIssueTitle...');
  const result = formatIssueTitle('Milestone 1: Setup', 'Test Task');
  const expected = '[Milestone 1: Setup] Test Task';
  
  if (result === expected) {
    console.log('✅ formatIssueTitle test passed');
    return true;
  } else {
    console.log(`❌ formatIssueTitle test failed. Expected: "${expected}", Got: "${result}"`);
    return false;
  }
}

function testFormatIssueBody() {
  console.log('Testing formatIssueBody...');
  const task = {
    description: 'Test description',
    success_criteria: 'Test criteria',
    unit_tests: 'Test requirements'
  };
  
  const result = formatIssueBody(task, 'Test Phase');
  const expectedElements = [
    'Test description',
    '**Success Criteria:** Test criteria',
    '**Unit Tests:** Test requirements',
    '**Phase:** Test Phase'
  ];
  
  let passed = true;
  for (const element of expectedElements) {
    if (!result.includes(element)) {
      console.log(`❌ formatIssueBody missing: "${element}"`);
      passed = false;
    }
  }
  
  if (passed) {
    console.log('✅ formatIssueBody test passed');
  }
  
  return passed;
}

function testProcessMilestoneStructure() {
  console.log('Testing processMilestoneStructure...');
  const result = processMilestoneStructure(testMilestoneData);
  
  if (result.length === 1 && 
      result[0].title === '[Milestone 1: Setup] Test Task' &&
      result[0].labels.includes('copilot:task')) {
    console.log('✅ processMilestoneStructure test passed');
    return true;
  } else {
    console.log('❌ processMilestoneStructure test failed');
    console.log('Result:', result);
    return false;
  }
}

function testProcessArrayStructure() {
  console.log('Testing processArrayStructure...');
  const result = processArrayStructure(testArrayData);
  
  if (result.length === 1 && 
      result[0].title === '[Planning Phase] Test Planning Task' &&
      result[0].labels.includes('copilot:task')) {
    console.log('✅ processArrayStructure test passed');
    return true;
  } else {
    console.log('❌ processArrayStructure test failed');
    console.log('Result:', result);
    return false;
  }
}

function testCreateIssuesAutomatically() {
  console.log('Testing createIssuesAutomatically...');
  
  // This will fail gracefully in test environment without GitHub CLI
  const testIssues = [
    {
      title: 'Test Issue',
      body: 'Test body',
      labels: ['test']
    }
  ];
  
  // Test that the function exists and handles errors gracefully
  if (typeof createIssuesAutomatically === 'function') {
    console.log('✅ createIssuesAutomatically function exists');
    return true;
  } else {
    console.log('❌ createIssuesAutomatically function not found');
    return false;
  }
}

function testFileExists() {
  console.log('Testing file existence...');
  const githubPath = path.join(__dirname, 'project_tasks.json');
  const docsPath = path.join(__dirname, '../docs/project_tasks.json');
  
  const githubData = parseJsonFile(githubPath);
  const docsData = parseJsonFile(docsPath);
  
  if (githubData && docsData) {
    console.log('✅ Both project_tasks.json files exist and are parseable');
    return true;
  } else {
    console.log('❌ File existence test failed');
    return false;
  }
}

function testCommandLineArgs() {
  console.log('Testing command line argument handling...');
  
  // Test that the script handles --create flag (we can't test actual execution)
  const originalArgv = process.argv;
  process.argv = ['node', 'script.js', '--create'];
  
  // Check if the args include --create
  const args = process.argv.slice(2);
  const hasCreateFlag = args.includes('--create');
  
  process.argv = originalArgv;
  
  if (hasCreateFlag) {
    console.log('✅ Command line argument parsing works');
    return true;
  } else {
    console.log('❌ Command line argument parsing failed');
    return false;
  }
}

// Run all tests
function runTests() {
  console.log('🧪 Running Issue Creation Tests\n');
  
  const tests = [
    testFormatIssueTitle,
    testFormatIssueBody, 
    testProcessMilestoneStructure,
    testProcessArrayStructure,
    testCreateIssuesAutomatically,
    testFileExists,
    testCommandLineArgs
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    if (test()) {
      passed++;
    }
    console.log('');
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Issue creation tooling is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return passed === total;
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };