const s = require('./descriptions/api.github.com/api.github.com.json');
const fs = require('fs');
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete','head'];

let allOps = [];

paths.forEach(p => {
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
      const hasCursor = params.some(param => {
        if (param.name === 'cursor' || param.name === 'after' || param.name === 'before') return true;
        return false;
      });
      const responseCodes = op.responses ? Object.keys(op.responses) : [];
      allOps.push({
        method: m.toUpperCase(),
        path: p,
        operationId: op.operationId,
        summary: op.summary,
        tags: op.tags || [],
        deprecated: op.deprecated || false,
        hasPagination,
        hasCursor,
        responseCodes,
        enabledForApps: op['x-github'] ? op['x-github'].enabledForGitHubApps : null,
        triggersNotification: op['x-github'] ? op['x-github'].triggersNotification : null,
        githubCloudOnly: op['x-github'] ? op['x-github'].githubCloudOnly : null
      });
    }
  });
});

fs.writeFileSync('_all_ops.json', JSON.stringify(allOps, null, 2));
console.log('Written', allOps.length, 'operations to _all_ops.json');

// Pagination stats
const paginated = allOps.filter(o => o.hasPagination);
const cursor = allOps.filter(o => o.hasCursor);
console.log('Paginated (per_page/page):', paginated.length);
console.log('Cursor paginated:', cursor.length);

// Deprecated
const deprecated = allOps.filter(o => o.deprecated);
console.log('Deprecated:', deprecated.length);

// App-enabled
const appEnabled = allOps.filter(o => o.enabledForApps === true);
console.log('GitHub App enabled:', appEnabled.length);

// Notification triggers
const notif = allOps.filter(o => o.triggersNotification === true);
console.log('Triggers notification (abuse risk):', notif.length);
notif.forEach(o => console.log(' ', o.method, o.path));
