const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('painel nao exibe literal \\n entre Analises e Integridade',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.doesNotMatch(html,/Análises<\/a>\\n\s*<a[^>]+integridade\.html/);
  assert.match(html,/Análises<\/a>\s*<a[^>]+integridade\.html/);
});

test('relatorio PDF/impressao usa identidade visual e assinatura institucional',()=>{
  const js=fs.readFileSync('app.js','utf8');
  assert.match(js,/assets\/sistema-thiago-logo\.svg/);
  assert.match(js,/@page\{size:A4 landscape/);
  assert.match(js,/Jus 9 Tecnologia Jurídica/);
  assert.match(js,/Assinatura institucional do relatório/);
  assert.match(js,/Nota de conferência/);
  assert.match(js,/print-color-adjust:exact/);
});
