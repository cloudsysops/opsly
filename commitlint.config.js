module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Formatting, no code change
        'refactor', // Code change that neither fixes nor adds
        'perf', // Performance improvement
        'test', // Adding/updating tests
        'build', // Build system or dependencies
        'ci', // CI configuration
        'chore', // Maintenance, no production code
        'revert', // Revert a previous commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
  prompt: {
    messages: {
      type: "Select the type of change that you're committing:",
      scope: 'Denote the SCOPE of this change (optional):',
      customScope: 'Denote the SCOPE of this change:',
      subject: 'Write a SHORT, IMPERATIVE description of the change:\n',
      body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
      breaking: 'List any BREAKING CHANGES (optional). Use "|" to break new line:\n',
      footerPrefixesSelect: 'Select ISSUES type of changeList by this change (optional):',
      customFooterPrefix: 'ISSUE: ',
      footer: 'List any ISSUES by this change. E.g.: #31, #34:\n',
      generatingByAI: 'Generating your AI commit subject...',
      generatedSelect: 'Select suitable subject:',
      confirmCommit: 'Are you sure you want to proceed with the commit above?',
    },
    scopes: [
      'api',
      'admin',
      'portal',
      'ml',
      'orchestrator',
      'mcp',
      'llm-gateway',
      'docs',
      'infra',
      'scripts',
      'deps',
    ],
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    customScopesAlias: 'custom',
    emptyScopesAlias: 'skip',
    customFooterPrefixAlias: 'custom',
    emptyFooterPrefixAlias: 'skip',
    breaklineNumber: 100,
    breaklineChar: '|',
    skipQuestions: [],
    issuePrefixes: [{ value: 'CLOSED:', name: 'CLOSED:   ISSUES has been resolved' }],
    customIssuePrefixAlign: 'top',
    emptyIssuePrefixAlias: 'skip',
    customIssuePrefixAlias: 'custom',
    allowCustomIssuePrefix: true,
    allowEmptyIssuePrefix: true,
    confirmColorize: true,
    maxHeaderLength: 100,
    maxSubjectLength: 100,
    minSubjectLength: 10,
    scopePattern: /^[a-zA-Z0-9-]+$/,
    enableMultipleScopes: true,
    scopeEnumSeparator: ',',
  },
};
