const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');

test('ST-MNM-27B Worker publica somente a saída sanitizada dist',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const wrangler=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
  assert.equal(pkg.scripts.build,'npm run build:pages');
  assert.match(pkg.scripts.deploy,/npm run build/);
  assert.match(pkg.scripts.deploy,/wrangler deploy/);
  assert.equal(wrangler.assets.directory,'./dist');

  execFileSync(process.execPath,['scripts/build-pages.cjs'],{stdio:'pipe'});
  assert.ok(fs.existsSync('dist/index.html'));
  for(const internal of ['supabase','tests','docs','security','.github','.git','scripts']){
    assert.equal(fs.existsSync('dist/'+internal),false,'dist não deve publicar '+internal);
  }
});
