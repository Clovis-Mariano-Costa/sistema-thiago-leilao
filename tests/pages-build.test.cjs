const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

test('build do Pages publica somente arquivos do site',()=>{
  execFileSync(process.execPath,['scripts/build-pages.cjs'],{stdio:'pipe'});
  assert.ok(fs.existsSync(path.join('dist','index.html')));
  assert.ok(fs.existsSync(path.join('dist','app.html')));
  assert.ok(fs.existsSync(path.join('dist','assets','sistema-thiago-logo.svg')));
  for(const name of ['supabase','tests','docs','.github','scripts']){
    assert.equal(fs.existsSync(path.join('dist',name)),false,name+' não deve ir para o Pages');
  }
});


test('workflow do GitHub Pages publica somente a pasta dist',()=>{
  const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
  assert.match(workflow,/run: node scripts\/build-pages\.cjs/);
  assert.match(workflow,/path: dist/);
  assert.doesNotMatch(workflow,/path: \.\s*$/m);
});
