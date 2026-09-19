const s = require('./descriptions/api.github.com/api.github.com.json');
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete'];

let repoOps = [];

paths.forEach(p => {
  if (p.includes('/repos/')) {
    const pathObj = s.paths[p];
    methods.forEach(m => {
      if (pathObj[m]) {
        const op = pathObj[m];
        const params = op.parameters || [];
        const hasPagination = params.some(param => {
          if (param.name === 'per_page' || param.name === 'page') return true;
          if (param['$ref'] && (param['$ref'].includes('per_page') || param['$ref'].includes('page'))) return true;
          return false;
        });
        repoOps.push({
          method: m.toUpperCase(),
          path: p,
          operationId: op.operationId,
          summary: op.summary,
          tags: op.tags || [],
          deprecated: op.deprecated || false,
          hasPagination,
          xGithub: op['x-github'] || {}
        });
      }
    });
  }
});

console.log('Total /repos operations:', repoOps.length);
console.log('\n=== CRITICAL DEVANT ENDPOINTS ===\n');

const critical = [
  '/repos/{owner}/{repo}',
  '/repos/{owner}/{repo}/commits',
  '/repos/{owner}/{repo}/commits/{ref}',
  '/repos/{owner}/{repo}/compare/{basehead}',
  '/repos/{owner}/{repo}/pulls',
  '/repos/{owner}/{repo}/pulls/{pull_number}',
  '/repos/{owner}/{repo}/pulls/{pull_number}/reviews',
  '/repos/{owner}/{repo}/issues',
  '/repos/{owner}/{repo}/issues/{issue_number}',
  '/repos/{owner}/{repo}/deployments',
  '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses',
  '/repos/{owner}/{repo}/releases',
  '/repos/{owner}/{repo}/releases/latest',
  '/repos/{owner}/{repo}/contributors',
  '/repos/{owner}/{repo}/branches',
  '/repos/{owner}/{repo}/hooks',
  '/repos/{owner}/{repo}/actions/runs',
  '/repos/{owner}/{repo}/events',
  '/repos/{owner}/{repo}/languages',
  '/repos/{owner}/{repo}/tags',
  '/repos/{owner}/{repo}/traffic/views',
  '/repos/{owner}/{repo}/traffic/clones'
];

critical.forEach(path => {
  const ops = repoOps.filter(o => o.path === path);
  if (ops.length > 0) {
    ops.forEach(o => {
      console.log(`${o.method} ${o.path}`);
      console.log(`  operationId: ${o.operationId}`);
      console.log(`  summary: ${o.summary}`);
      console.log(`  pagination: ${o.hasPagination}`);
      console.log(`  tags: ${o.tags.join(', ')}`);
      console.log('');
    });
  }
});
