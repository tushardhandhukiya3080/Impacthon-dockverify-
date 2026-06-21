#!/usr/bin/env node

/**
 * Simple test runner for property tests
 * This script runs jest programmatically to avoid PowerShell execution policy issues
 */

import { run } from 'jest';

const args = [
  'tests/property/otpService.property.test.js',
  '--testNamePattern=Property 8',
  '--verbose',
  '--no-coverage'
];

run(args);
