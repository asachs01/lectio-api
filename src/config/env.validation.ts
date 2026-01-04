/**
 * Environment Variable Validation
 *
 * This module validates that all required environment variables are set
 * before the application starts. It fails fast with clear error messages
 * rather than allowing the app to run with insecure defaults.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvRequirement {
  name: string;
  required: boolean;
  requiredInProduction: boolean;
  description: string;
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  {
    name: 'DB_PASSWORD',
    required: false,
    requiredInProduction: true,
    description: 'Database password for PostgreSQL connection',
  },
  {
    name: 'JWT_SECRET',
    required: false,
    requiredInProduction: true,
    description: 'Secret key for JWT token signing (min 32 characters recommended)',
  },
];

/**
 * Validates that all required environment variables are properly set.
 * Returns validation result with errors and warnings.
 */
export function validateEnvironment(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const requirement of ENV_REQUIREMENTS) {
    const value = process.env[requirement.name];
    const isRequired = requirement.required || (requirement.requiredInProduction && isProduction);

    if (isRequired && !value) {
      errors.push(`Missing required environment variable: ${requirement.name} - ${requirement.description}`);
    } else if (!value && requirement.requiredInProduction && !isProduction) {
      warnings.push(`${requirement.name} is not set. This is required in production.`);
    }
  }

  // Additional security validations
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      if (isProduction) {
        errors.push('JWT_SECRET should be at least 32 characters for security');
      } else {
        warnings.push('JWT_SECRET is shorter than recommended 32 characters');
      }
    }

    // Check for obviously insecure values
    const insecureSecrets = ['secret', 'password', 'dev-secret', 'change-me', 'your-secret'];
    if (insecureSecrets.some(s => process.env.JWT_SECRET?.toLowerCase().includes(s))) {
      if (isProduction) {
        errors.push('JWT_SECRET contains an insecure default value');
      } else {
        warnings.push('JWT_SECRET appears to be a development placeholder');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and throws an error if validation fails.
 * Logs warnings for non-critical issues.
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();

  // Log warnings (using console.warn is intentional for startup validation)
  for (const warning of result.warnings) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  ENV WARNING: ${warning}`);
  }

  // Throw on errors
  if (!result.valid) {
    const errorMessage = [
      '❌ Environment validation failed:',
      '',
      ...result.errors.map(e => `  • ${e}`),
      '',
      'Please set the required environment variables and restart the application.',
    ].join('\n');

    throw new Error(errorMessage);
  }
}
