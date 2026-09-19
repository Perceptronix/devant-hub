const s = require('./descriptions/api.github.com/api.github.com.json');
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete','head','options'];
let ops = [];

paths.forEach(p => {
  const pathObj = s.paths[p];
  methods.forEach(m => {
    if (pathObj[m]) {
      const op = pathObj[m];
      const params = op.parameters || [];
      const hasPagination = params.some(param => {
        if (param.name === 'per_page') return true;
        if (param['$ref'] && param['$ref'].includes('per_page')) return true;
        return false;
      });
      ops.push({
        method: m.toUpperCase(),
        path: p,
        operationId: op.operationId,
        tags: op.tags || [],
        deprecated: op.deprecated || false,
        hasPagination,
        xGithub: op['x-github'] || {}
      });
    }
  });
});

console.log('Total operations:', ops.length);
const byTag = {};
ops.forEach(o => {
  (o.tags.length ? o.tags : ['untagged']).forEach(t => {
    byTag[t] = (byTag[t] || 0) + 1;
  });
});
console.log(JSON.stringify(byTag, null, 2));
