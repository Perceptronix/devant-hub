const s = require('./descriptions/api.github.com/api.github.com.json');
const fs = require('fs');
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete','head'];

const inventory = [];

paths.forEach(p => {
  const pathObj = s.paths[p];
  methods.forEach(m => {
    if (!pathObj[m]) return;
    const op = pathObj[m];
    const params = op.parameters || [];

    const hasPagination = params.some(param => {
      if (param.name === 'per_page' || param.name === 'page') return true;
      if (param['$ref'] && (param['$ref'].includes('per_page') || param['$ref'].includes('page'))) return true;
      return false;
    });

    const hasSince = params.some(param => {
      if (param.name === 'since') return true;
      if (param['$ref'] && param['$ref'].includes('since')) return true;
      return false;
    });

    const responseCodes = op.responses ? Object.keys(op.responses) : [];
    const has202 = responseCodes.includes('202');
    const linkHeader = responseCodes.some(code => {
      const resp = op.responses[code];
      return resp && resp.headers && resp.headers['Link'];
    });

    const xg = op['x-github'] || {};

    inventory.push({
      method: m.toUpperCase(),
      path: p,
      operationId: op.operationId || null,
      summary: op.summary || null,
      tags: op.tags || [],
      deprecated: op.deprecated || false,
      pagination: hasPagination,
      linkHeader,
      hasSince,
      statsAsync: has202,
      responseCodes,
      enabledForGitHubApps: xg.enabledForGitHubApps ?? null,
      triggersNotification: xg.triggersNotification ?? false,
      githubCloudOnly: xg.githubCloudOnly ?? false,
    });
  });
});

fs.writeFileSync(
  'src/integrations/github/openapi/full-endpoint-inventory.json',
  JSON.stringify({ 
    meta: {
      source: 'descriptions/api.github.com/api.github.com.json',
      openapiVersion: s.openapi,
      specVersion: s.info.version,
      totalOperations: inventory.length,
      generatedAt: new Date().toISOString()
    },
    endpoints: inventory 
  }, null, 2)
);

console.log('Generated inventory:', inventory.length, 'operations');
console.log('Paginated:', inventory.filter(o => o.pagination).length);
console.log('Link header:', inventory.filter(o => o.linkHeader).length);
console.log('Has since param:', inventory.filter(o => o.hasSince).length);
console.log('Stats async (202):', inventory.filter(o => o.statsAsync).length);
console.log('Deprecated:', inventory.filter(o => o.deprecated).length);
console.log('App-enabled:', inventory.filter(o => o.enabledForGitHubApps === true).length);
console.log('Triggers notification:', inventory.filter(o => o.triggersNotification).length);
