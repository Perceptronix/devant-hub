const s = require('./descriptions/api.github.com/api.github.com.json');

// Extract response schemas for key endpoints
const keyEndpoints = [
  { method: 'get', path: '/repos/{owner}/{repo}' },
  { method: 'get', path: '/repos/{owner}/{repo}/commits' },
  { method: 'get', path: '/repos/{owner}/{repo}/commits/{ref}' },
  { method: 'get', path: '/repos/{owner}/{repo}/pulls' },
  { method: 'get', path: '/repos/{owner}/{repo}/pulls/{pull_number}' },
  { method: 'get', path: '/repos/{owner}/{repo}/pulls/{pull_number}/reviews' },
  { method: 'get', path: '/repos/{owner}/{repo}/issues' },
  { method: 'get', path: '/repos/{owner}/{repo}/issues/{issue_number}' },
  { method: 'get', path: '/repos/{owner}/{repo}/deployments' },
  { method: 'get', path: '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses' },
  { method: 'get', path: '/repos/{owner}/{repo}/releases' },
  { method: 'get', path: '/repos/{owner}/{repo}/releases/latest' },
  { method: 'get', path: '/repos/{owner}/{repo}/actions/runs' },
  { method: 'get', path: '/repos/{owner}/{repo}/actions/runs/{run_id}' },
  { method: 'get', path: '/rate_limit' },
];

keyEndpoints.forEach(({ method, path }) => {
  const pathObj = s.paths[path];
  if (!pathObj) { console.log(`NOT FOUND: ${path}`); return; }
  const op = pathObj[method];
  if (!op) return;
  const responses = op.responses || {};
  console.log(`\n${method.toUpperCase()} ${path}`);
  Object.keys(responses).forEach(code => {
    const resp = responses[code];
    const headers = resp.headers ? Object.keys(resp.headers) : [];
    let schemaRef = null;
    if (resp.content && resp.content['application/json']) {
      const schema = resp.content['application/json'].schema;
      if (schema) {
        schemaRef = schema['$ref'] || (schema.items && schema.items['$ref']) || schema.type;
      }
    }
    console.log(`  ${code}: headers=[${headers.join(',')}] schema=${schemaRef}`);
  });
});

// Check Link header usage
console.log('\n\n=== LINK HEADER PAGINATION CHECK ===');
const paths = Object.keys(s.paths);
const methods = ['get'];
let linkHeaderCount = 0;
paths.forEach(p => {
  const pathObj = s.paths[p];
  methods.forEach(m => {
    if (pathObj[m]) {
      const op = pathObj[m];
      const resp200 = op.responses && (op.responses['200'] || op.responses['default']);
      if (resp200 && resp200.headers && resp200.headers['Link']) {
        linkHeaderCount++;
      }
    }
  });
});
console.log('Endpoints with Link header:', linkHeaderCount);
