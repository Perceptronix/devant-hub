const s = require('./descriptions/api.github.com/api.github.com.json');

// Check security schemes
console.log('=== SECURITY SCHEMES ===');
const secSchemes = s.components.securitySchemes || {};
Object.keys(secSchemes).forEach(k => {
  console.log(k, JSON.stringify(secSchemes[k], null, 2));
});

// Check global security
console.log('\n=== GLOBAL SECURITY ===');
console.log(JSON.stringify(s.security, null, 2));

// Sample a few operations to see their security
const paths = Object.keys(s.paths);
const methods = ['get','post','put','patch','delete'];
let withSecurity = 0, withoutSecurity = 0;
const securityTypes = {};

paths.forEach(p => {
  const pathObj = s.paths[p];
  methods.forEach(m => {
    if (pathObj[m]) {
      const op = pathObj[m];
      if (op.security !== undefined) {
        withSecurity++;
        op.security.forEach(sec => {
          Object.keys(sec).forEach(k => { securityTypes[k] = (securityTypes[k]||0)+1; });
        });
      } else {
        withoutSecurity++;
      }
    }
  });
});

console.log('\nOps with explicit security:', withSecurity);
console.log('Ops inheriting global security:', withoutSecurity);
console.log('Security types:', securityTypes);

// Check x-github enabledForGitHubApps breakdown
const paths2 = Object.keys(s.paths);
let appEnabled = 0, appDisabled = 0, appNull = 0;
paths2.forEach(p => {
  const pathObj = s.paths[p];
  methods.forEach(m => {
    if (pathObj[m]) {
      const op = pathObj[m];
      const xg = op['x-github'];
      if (!xg) { appNull++; return; }
      if (xg.enabledForGitHubApps === true) appEnabled++;
      else if (xg.enabledForGitHubApps === false) appDisabled++;
      else appNull++;
    }
  });
});
console.log('\nGitHub App enabled:', appEnabled);
console.log('GitHub App disabled:', appDisabled);
console.log('No x-github info:', appNull);
