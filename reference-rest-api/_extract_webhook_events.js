const s = require('./descriptions/api.github.com/api.github.com.json');
const fs = require('fs');

// Find all webhook-related endpoints
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete'];

const webhookOps = [];
paths.forEach(p => {
  if (p.includes('/hooks') || p.includes('/webhook')) {
    const pathObj = s.paths[p];
    methods.forEach(m => {
      if (pathObj[m]) {
        const op = pathObj[m];
        webhookOps.push({
          method: m.toUpperCase(),
          path: p,
          operationId: op.operationId,
          summary: op.summary
        });
      }
    });
  }
});

console.log('Webhook endpoints:', webhookOps.length);
webhookOps.forEach(o => console.log(`  ${o.method} ${o.path} [${o.operationId}]`));

// Extract specific endpoint details for key DevANT endpoints
const keyPaths = [
  '/repos/{owner}/{repo}/commits',
  '/repos/{owner}/{repo}/pulls',
  '/repos/{owner}/{repo}/pulls/{pull_number}',
  '/repos/{owner}/{repo}/issues',
  '/repos/{owner}/{repo}/deployments',
  '/repos/{owner}/{repo}/actions/runs',
  '/repos/{owner}/{repo}/actions/runs/{run_id}',
  '/repos/{owner}/{repo}/stats/contributors',
  '/repos/{owner}/{repo}/stats/commit_activity',
  '/repos/{owner}/{repo}/stats/code_frequency',
  '/repos/{owner}/{repo}/stats/participation',
  '/repos/{owner}/{repo}/stats/punch_card'
];

console.log('\n=== KEY ENDPOINT PARAMETERS ===\n');
keyPaths.forEach(p => {
  const pathObj = s.paths[p];
  if (!pathObj) { console.log(`NOT FOUND: ${p}`); return; }
  const op = pathObj['get'];
  if (!op) return;
  const params = op.parameters || [];
  console.log(`GET ${p}`);
  console.log(`  operationId: ${op.operationId}`);
  params.forEach(param => {
    if (param['$ref']) {
      console.log(`  param: $ref=${param['$ref']}`);
    } else {
      console.log(`  param: ${param.name} (${param.in}) ${param.required ? 'required' : 'optional'} schema=${JSON.stringify(param.schema)}`);
    }
  });
  console.log('');
});
