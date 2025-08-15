module.exports = {
  extends: 'universe/native',
  root: true,
  rules: {
    // Enforce braces around all control statements, including single-line if/else
    curly: ['error', 'all'],

    // Additional related rules for consistent brace style
    'brace-style': ['error', '1tbs', { allowSingleLine: false }],
  },
};
