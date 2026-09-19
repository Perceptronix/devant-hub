const s = require('./descriptions/api.github.com/api.github.com.json');

// Extract all actions endpoints + DORA-relevant endpoints
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete'];

const doraRelevant = [];
const actionsOps = [];

const doraPatterns = [
  '/actions/runs', '/actions/jobs', '/actions/workflows',
  '/deployments', '/releases', '/commits', '/pulls',
  '/stats/', '/traffic/', '/compare/'
];

paths.forEach(p => {
  const pathObj = s.paths[p];
  methods.forEach(m => {
    if (pathObj[m]) {
      const op = pathObj[m];
      const isDora = doraPatterns.some(pat => p.includes(pat));
      if (isDora) {
        doraRelevant.push({ method: m.toUpperCase(), path: p, operationId: op.operationId, summary: op.summary });
      }
      if (p.includes('/actions/')) {
        actionsOps.push({ method: m.toUpperCase(), path: p, operationId: op.operationId, summary: op.summary });
      }
    }
  });
});

console.log('=== DORA-RELEVANT ENDPOINTS ===');
doraRelevant.forEach(o => console.log(`  ${o.method} ${o.path} [${o.operationId}]`));

console.log('\n=== ACTIONS ENDPOINTS (subset) ===');
actionsOps.slice(0, 40).forEach(o => console.log(`  ${o.method} ${o.path} [${o.operationId}]`));
console.log(`  ... total: ${actionsOps.length}`);

// Check workflow run schema fields for DORA
const workflowRun = s.components.schemas['workflow-run'];
if (workflowRun) {
  console.log('\n=== workflow-run schema fields ===');
  Object.keys(workflowRun.properties || {}).forEach(k => {
    const prop = workflowRun.properties[k];
    console.log(`  ${k}: ${prop.type || prop['$ref'] || 'object'} ${prop.format ? '('+prop.format+')' : ''}`);
  });
}

// Check deployment schema
const deployment = s.components.schemas['deployment'];
if (deployment) {
  console.log('\n=== deployment schema fields ===');
  Object.keys(deployment.properties || {}).forEach(k => {
    const prop = deployment.properties[k];
    console.log(`  ${k}: ${prop.type || prop['$ref'] || 'object'} ${prop.format ? '('+prop.format+')' : ''}`);
  });
}
