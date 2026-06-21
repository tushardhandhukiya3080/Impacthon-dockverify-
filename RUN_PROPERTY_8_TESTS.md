# Running Property 8 Tests for Expired OTP Rejection

## Test Location
`tests/property/otpService.property.test.js`

## How to Run the Tests

### Option 1: Run only Property 8 tests
```bash
npx jest tests/property/otpService.property.test.js --testNamePattern="Property 8"
```

### Option 2: Run all property tests in the file
```bash
npx jest tests/property/otpService.property.test.js
```

### Option 3: Run with verbose output
```bash
npx jest tests/property/otpService.property.test.js --testNamePattern="Property 8" --verbose
```

## Expected Results

The Property 8 test suite includes 8 test cases:

1. ✓ expired OTP always fails validation with expiration error
2. ✓ OTP expires exactly at expiration timestamp
3. ✓ expired OTP rejection is consistent across multiple validation attempts
4. ✓ expired OTP rejection works regardless of email format variation
5. ✓ non-expired OTP passes validation while expired OTP fails
6. ✓ OTP expiration check happens before OTP code matching
7. ✓ OTP expiration is precise to the millisecond
8. ✓ OTP just before expiration passes, just after expiration fails

Each test runs 100 iterations with randomized inputs (property-based testing).

## What the Tests Validate

**Validates: Requirements 3.2**

Property: For any OTP that has passed its expiration timestamp, validation SHALL fail and return an error indicating expiration.

## Troubleshooting

If you encounter PowerShell execution policy issues, try:

1. Open Command Prompt (cmd.exe) instead of PowerShell
2. Navigate to the docV directory: `cd path\to\docV`
3. Run: `npx jest tests/property/otpService.property.test.js --testNamePattern="Property 8"`

Or temporarily allow script execution in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

Then run the jest command.
