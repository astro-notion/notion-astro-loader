/**
 * Validates configuration for the separately invoked live Notion test.
 */

/** Required credentials and fixture identifier for live verification. */
export interface LiveTestConfig {
  token: string;
  dataSourceId: string;
}

/**
 * Reads live-test configuration without including secret values in errors.
 */
export function getLiveTestConfig(environment: NodeJS.ProcessEnv = process.env): LiveTestConfig {
  const requiredVariables = ['NOTION_TEST_TOKEN', 'NOTION_TEST_DATA_SOURCE_ID'] as const;
  const missingVariables = requiredVariables.filter((name) => !environment[name]);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing live Notion test configuration: ${missingVariables.join(', ')}. Configure the variables and rerun pnpm test:live.`
    );
  }

  return {
    token: environment.NOTION_TEST_TOKEN!,
    dataSourceId: environment.NOTION_TEST_DATA_SOURCE_ID!,
  };
}
