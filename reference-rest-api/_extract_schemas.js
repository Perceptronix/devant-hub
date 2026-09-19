const s = require('./descriptions/api.github.com/api.github.com.json');
const fs = require('fs');

// Extract key schemas for DevANT
const keySchemas = [
  'repository', 'full-repository', 'short-repository',
  'commit', 'diff-entry', 'commit-comparison',
  'pull-request', 'pull-request-simple', 'pull-request-review',
  'pull-request-review-comment',
  'issue', 'issue-comment',
  'deployment', 'deployment-status',
  'release', 'release-asset',
  'contributor',
  'branch-with-protection', 'short-branch',
  'hook', 'hook-delivery',
  'workflow-run', 'workflow',
  'event',
  'rate-limit-overview',
  'code-scanning-alert',
  'secret-scanning-alert',
  'repository-advisory',
  'tag',
  'traffic',
  'view-traffic', 'clone-traffic'
];

const found = {};
const schemas = s.components.schemas;
keySchemas.forEach(name => {
  if (schemas[name]) {
    const schema = schemas[name];
    found[name] = {
      type: schema.type,
      properties: schema.properties ? Object.keys(schema.properties) : [],
      required: schema.required || []
    };
  }
});

fs.writeFileSync('_key_schemas.json', JSON.stringify(found, null, 2));
console.log('Key schemas extracted:', Object.keys(found).length);
Object.keys(found).forEach(k => {
  console.log(`  ${k}: ${found[k].properties.length} properties`);
});

// Also extract reusable parameters
const params = s.components.parameters;
const paramNames = Object.keys(params);
console.log('\nReusable parameters:', paramNames.length);
const paginationParams = paramNames.filter(n => n.includes('per-page') || n.includes('page') || n.includes('cursor'));
console.log('Pagination params:', paginationParams);
paginationParams.forEach(n => {
  const p = params[n];
  console.log(`  ${n}: in=${p.in}, name=${p.name}, schema=${JSON.stringify(p.schema)}`);
});
