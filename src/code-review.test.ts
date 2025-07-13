/**
 * Tests for the code review functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { validateCodeReviewRequest } from '../src/router.js';
import { CodeReviewRequest } from '../src/types.js';

describe('Code Review Functionality', () => {
  describe('validateCodeReviewRequest', () => {
    it('should validate a proper code review request', () => {
      const request: CodeReviewRequest = {
        code: 'function hello() { console.log("Hello World"); }',
        language: 'javascript',
        filename: 'hello.js'
      };
      
      expect(() => validateCodeReviewRequest(request)).not.toThrow();
    });

    it('should throw error for empty code', () => {
      const request: CodeReviewRequest = {
        code: '',
        language: 'javascript'
      };
      
      expect(() => validateCodeReviewRequest(request)).toThrow('Code is required and cannot be empty');
    });

    it('should throw error for code that is too large', () => {
      const request: CodeReviewRequest = {
        code: 'x'.repeat(50001),
        language: 'javascript'
      };
      
      expect(() => validateCodeReviewRequest(request)).toThrow('Code is too large');
    });

    it('should throw error for invalid temperature', () => {
      const request: CodeReviewRequest = {
        code: 'function hello() {}',
        temperature: 2.5
      };
      
      expect(() => validateCodeReviewRequest(request)).toThrow('Temperature must be between 0 and 1');
    });

    it('should throw error for invalid focus areas', () => {
      const request: CodeReviewRequest = {
        code: 'function hello() {}',
        focus_areas: ['invalid-area']
      };
      
      expect(() => validateCodeReviewRequest(request)).toThrow('Invalid focus area');
    });

    it('should accept valid focus areas', () => {
      const request: CodeReviewRequest = {
        code: 'function hello() {}',
        focus_areas: ['security', 'performance', 'maintainability']
      };
      
      expect(() => validateCodeReviewRequest(request)).not.toThrow();
    });

    it('should throw error for too many focus areas', () => {
      const request: CodeReviewRequest = {
        code: 'function hello() {}',
        focus_areas: Array(11).fill('security')
      };
      
      expect(() => validateCodeReviewRequest(request)).toThrow('Maximum 10 focus areas allowed');
    });
  });
});