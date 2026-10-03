const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const out=path.join(root,'dist');
const publicFiles=[
  'index.html','app.html','app.js','charlie-echo.html','charlie-page.js','recuperar-legado.html','legacy-recovery.js',
  'auth.html','auth.js','auth-config.js',
  'charlie-chat.js','cloud-sync.js',
  'cookie-notice.js','cookies.html',
  'fipe.html','fipe.js',
  'fontes-oficiais.html','fontes.js','official-sources.js',
  'landing.css','landing.js',
  'parceria.html','privacidade.html','termos.html',
  'session-ui.js','styles.css','user-references.js',
  'favicon.png','favicon.svg'
];

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

for(const file of publicFiles){
  const src=path.join(root,file);
  if(!fs.existsSync(src)) throw new Error('Arquivo público ausente: '+file);
  fs.copyFileSync(src,path.join(out,file));
}

const assetsSrc=path.join(root,'assets');
if(!fs.existsSync(assetsSrc)) throw new Error('Pasta assets ausente');
fs.cpSync(assetsSrc,path.join(out,'assets'),{recursive:true});

if(!fs.existsSync(path.join(out,'index.html'))) throw new Error('dist/index.html não foi criado');

const forbidden=['supabase','tests','docs','security','.github','.git','scripts'];
for(const name of forbidden){
  if(fs.existsSync(path.join(out,name))) throw new Error('Conteúdo interno copiado indevidamente: '+name);
}

console.log('Cloudflare Pages: dist preparada com somente os arquivos públicos.');
