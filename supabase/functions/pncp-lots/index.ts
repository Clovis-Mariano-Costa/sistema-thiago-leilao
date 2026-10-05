import pdf from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parsePrfLots, renderPdfRows, scorePrfPdfUrl } from "./prf-parser.mjs";

const PNCP_BASE = "https://pncp.gov.br/pncp-api/v1";
const allowedOrigins = new Set([
  "https://clovis-mariano-costa.github.io",
  "https://sistema.thiago.jus9verde.jus9tecnologia.com.br"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://clovis-mariano-costa.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(req: Request, body: unknown, status=200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...cors(req), "Content-Type":"application/json; charset=utf-8"}
  });
}


function adminSupabase(){
  const url=Deno.env.get("SUPABASE_URL") || "";
  if(!url) return null;

  let secret="";
  try{
    const secretMap=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    secret=String(secretMap?.default || "");
  }catch{}
  if(!secret) secret=String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if(!secret) return null;

  return createClient(url,secret,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
}

async function startSourceRun(sourceId:string,query:string,metadata:any={}){
  const admin=adminSupabase();
  if(!admin || !sourceId) return {admin:null,runId:""};
  try{
    const {data,error}=await admin
      .from("source_search_runs")
      .insert({
        source_id:sourceId,
        query:query||null,
        status:"started",
        found_count:0,
        metadata
      })
      .select("id")
      .single();
    if(error){
      console.warn("SOURCE_RUN_START_WARN",sourceId,error.message);
      return {admin,runId:""};
    }
    return {admin,runId:String(data?.id||"")};
  }catch(error){
    console.warn("SOURCE_RUN_START_WARN",sourceId,String(error?.message||error));
    return {admin,runId:""};
  }
}

async function finishSourceRun(admin:any,runId:string,status:string,foundCount:number,errorMessage="",metadata:any={}){
  if(!admin || !runId) return;
  try{
    const {error}=await admin
      .from("source_search_runs")
      .update({
        status,
        found_count:Math.max(0,Number(foundCount)||0),
        finished_at:new Date().toISOString(),
        error_message:errorMessage||null,
        metadata
      })
      .eq("id",runId);
    if(error) console.warn("SOURCE_RUN_FINISH_WARN",runId,error.message);
  }catch(error){
    console.warn("SOURCE_RUN_FINISH_WARN",runId,String(error?.message||error));
  }
}

async function recordSourceDocument(admin:any,sourceId:string,documentUsed:any,reference="",metadata:any={}){
  if(!admin || !sourceId || !documentUsed?.url) return "";
  try{
    const {data,error}=await admin
      .from("source_documents")
      .insert({
        source_id:sourceId,
        title:documentUsed.name||"Documento oficial utilizado",
        reference:reference||null,
        document_url:documentUsed.url,
        fetched_at:new Date().toISOString(),
        metadata:{
          ...metadata,
          pageUrl:documentUsed.pageUrl||null,
          documentSource:documentUsed.source||null,
          sequence:documentUsed.sequence??null
        }
      })
      .select("id")
      .single();
    if(error){
      console.warn("SOURCE_DOCUMENT_WARN",sourceId,error.message);
      return "";
    }
    return String(data?.id||"");
  }catch(error){
    console.warn("SOURCE_DOCUMENT_WARN",sourceId,String(error?.message||error));
    return "";
  }
}


async function requireConfirmedUser(req: Request) {
  const authHeader=req.headers.get("Authorization") || "";
  const token=authHeader.replace(/^Bearer\s+/i,"").trim();
  if(!token) return {response:json(req,{error:"Faça login para buscar lotes oficiais."},401),user:null};

  const url=Deno.env.get("SUPABASE_URL");
  const anon=Deno.env.get("SUPABASE_ANON_KEY");
  if(!url || !anon) return {response:json(req,{error:"Configuração de autenticação indisponível."},500),user:null};

  const client=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data,error}=await client.auth.getUser(token);
  const user=data?.user || null;
  if(error || !user) return {response:json(req,{error:"Sessão inválida ou expirada."},401),user:null};
  if(!user.email_confirmed_at) return {response:json(req,{error:"Confirme seu e-mail antes de usar a importação automática."},403),user:null};
  return {response:null,user};
}

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g,"");
}

function safeYear(value: unknown) {
  const y=Number(value);
  return Number.isInteger(y) && y>=2020 && y<=2100 ? y : null;
}

function safeSeq(value: unknown) {
  const n=Number(value);
  return Number.isInteger(n) && n>0 && n<1000000 ? n : null;
}

async function fetchJson(url:string) {
  const res=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"SistemaThiago/1.0"}});
  if(!res.ok) throw new Error(`PNCP respondeu ${res.status} em ${url}`);
  return await res.json();
}

function asArray(value:any): any[] {
  if(Array.isArray(value)) return value;
  if(Array.isArray(value?.data)) return value.data;
  if(Array.isArray(value?.content)) return value.content;
  if(Array.isArray(value?.items)) return value.items;
  return [];
}

function fileSeq(file:any,index:number) {
  const candidates=[
    file?.sequencialDocumento,file?.sequencial,file?.numeroDocumento,file?.numero,
    file?.id,file?.sequence
  ];
  for(const value of candidates){
    const n=Number(value);
    if(Number.isInteger(n)&&n>0) return n;
  }
  return index+1;
}

function fileName(file:any) {
  return String(
    file?.titulo || file?.tituloDocumento || file?.nome || file?.nomeArquivo ||
    file?.arquivo || file?.fileName || file?.descricao || ""
  );
}

function scoreFile(file:any) {
  const name=fileName(file).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  let score=0;
  if(name.includes("ESPECIFIC")) score+=100;
  if(name.includes("ANEXO II")) score+=90;
  if(name.includes("RELACAO") && name.includes("VEIC")) score+=90;
  if(name.includes("EDITAL DESCRITIVO")) score+=75;
  if(name.includes("EDITAL")) score+=50;
  if(name.includes("NOTIFIC")) score-=50;
  if(name.includes("COMPROMISSO")) score-=40;
  return score;
}

const PLATE=/^(?:[A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}[0-9]{4}|S\/?PLACA|SEMPLACA)$/i;
const YEAR=/^\d{4}\/\d{4}$/;
const START=/^\d{4,8}\s+\d{1,6}\s+/;

function money(value:string) {
  const clean=String(value||"").replace(/[^0-9,.-]/g,"");
  if(!clean) return "";
  return clean;
}

function parseCandidate(raw:string, context:string) {
  const normalized=raw.replace(/\s+/g," ").trim();
  const tokens=normalized.split(" ");
  if(tokens.length<8 || !/^\d{4,8}$/.test(tokens[0]) || !/^\d{1,6}$/.test(tokens[1])) return null;

  const plateIndex=tokens.findIndex((t,i)=>i>=3 && PLATE.test(t));
  if(plateIndex<3) return null;

  const yearIndex=tokens.findIndex((t,i)=>i>plateIndex && YEAR.test(t));
  if(yearIndex<0) return null;

  let currencyIndex=tokens.findIndex((t,i)=>i>yearIndex && t.toUpperCase()==="R$");
  if(currencyIndex<0 && tokens[yearIndex+1]?.toUpperCase().startsWith("R$")) currencyIndex=yearIndex+1;
  if(currencyIndex<0) return null;

  if(yearIndex-plateIndex<4) return null;
  const chassis=tokens[yearIndex-2] || "";
  const engine=tokens[yearIndex-1] || "";
  const brandModel=tokens.slice(plateIndex+1,yearIndex-2).join(" ").trim();
  const type=tokens.slice(2,plateIndex).join(" ").trim();
  const bidToken=tokens[currencyIndex]==="R$" ? tokens[currencyIndex+1] : tokens[currencyIndex].slice(2);

  if(!brandModel) return null;

  return {
    remocao:tokens[0],
    n:Number(tokens[1]),
    type,
    plate:tokens[plateIndex].toUpperCase(),
    brandModel,
    vehicle:brandModel,
    chassis,
    engine,
    year:tokens[yearIndex],
    minimumBid:money(bidToken),
    context,
    sourceType:"official",
    needsReview:true
  };
}

function parseLots(text:string) {
  const lines=text
    .replace(/\u00a0/g," ")
    .split(/\r?\n/)
    .map(line=>line.replace(/\s+/g," ").trim())
    .filter(Boolean);

  const lots:any[]=[];
  let context="";
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/(?:CONSERVADOS|SUCATAS)$/i.test(line) && !START.test(line)) context=line.slice(0,240);
    if(!START.test(line)) continue;

    let candidate=line;
    let parsed=parseCandidate(candidate,context);
    let j=i;
    while(!parsed && j+1<lines.length && j<i+4){
      const next=lines[++j];
      if(START.test(next)) break;
      if(/^(?:Rem Lote|M[ií]nimo|P[aá]g\.|LEIL[AÃ]O|ANEXO|RELA[CÇ][AÃ]O)/i.test(next)) continue;
      candidate += " " + next;
      parsed=parseCandidate(candidate,context);
    }
    if(parsed){
      lots.push(parsed);
      i=j;
    }
  }

  const byLot=new Map<number,any>();
  for(const lot of lots){
    if(!byLot.has(lot.n)) byLot.set(lot.n,lot);
  }
  return [...byLot.values()].sort((a,b)=>a.n-b.n);
}


const PRF_HOSTS=new Set(["www.gov.br","gov.br"]);

async function fetchPrfLots(pageUrl:string){
  const page=new URL(pageUrl);
  if(page.protocol!=="https:" || !PRF_HOSTS.has(page.hostname) || !page.pathname.startsWith("/prf/")){
    throw new Error("fonte PRF fora do domínio oficial gov.br/prf");
  }

  const pageResponse=await fetch(page.toString(),{
    headers:{"Accept":"text/html","User-Agent":"SistemaThiago/1.0"}
  });
  if(!pageResponse.ok) throw new Error(`PRF respondeu ${pageResponse.status} ao abrir a página oficial`);
  const html=await pageResponse.text();

  const links=[...html.matchAll(/href=["']([^"']+\.pdf(?:\/@@display-file\/file)?[^"']*)["']/gi)]
    .map(m=>{
      const decoded=String(m[1]||"").replaceAll("&amp;","&");
      const url=new URL(decoded,page).toString();
      return {url,score:scorePrfPdfUrl(url)};
    })
    .filter(x=>{
      try{
        const u=new URL(x.url);
        return u.protocol==="https:" && PRF_HOSTS.has(u.hostname) && u.pathname.startsWith("/prf/");
      }catch{return false;}
    })
    .sort((a,b)=>b.score-a.score);

  const candidate=links.find(x=>x.score>=100) || links[0];
  if(!candidate) throw new Error("Anexo PDF oficial da PRF não encontrado na página.");

  const pdfResponse=await fetch(candidate.url,{
    redirect:"follow",
    headers:{"Accept":"application/pdf,*/*","User-Agent":"SistemaThiago/1.0"}
  });
  if(!pdfResponse.ok) throw new Error(`PRF respondeu ${pdfResponse.status} ao baixar o Anexo I`);
  const bytes=new Uint8Array(await pdfResponse.arrayBuffer());
  if(bytes.byteLength>20*1024*1024) throw new Error("Anexo I da PRF maior que 20 MB");

  const pdfMagic=String.fromCharCode(...bytes.slice(0,4));
  const contentType=String(pdfResponse.headers.get("content-type")||"").toLowerCase();
  if(pdfMagic!=="%PDF" && !contentType.includes("pdf")){
    throw new Error("Anexo I oficial não respondeu como PDF.");
  }

  const parsedPdf=await pdf(Buffer.from(bytes),{pagerender:renderPdfRows});
  const parsed=parsePrfLots(String(parsedPdf.text||""));
  console.log("PRF_PARSE_DIAG",JSON.stringify({
    pages:parsedPdf.numpages||null,
    textChars:String(parsedPdf.text||"").length,
    sourceRows:parsed.sourceRows,
    lots:parsed.lots.length,
    warnings:parsed.failures.length,
    firstLot:parsed.lots[0]?.n||null,
    lastLot:parsed.lots.at(-1)?.n||null,
    sampleText:String(parsedPdf.text||"").slice(0,500)
  }));
  if(!parsed.sourceRows){
    throw new Error("Nenhuma linha de lote foi localizada no Anexo I da PRF após reconstrução por linhas.");
  }
  if(parsed.lots.length!==parsed.sourceRows){
    throw new Error(`Inconsistência interna PRF: ${parsed.lots.length} lotes montados para ${parsed.sourceRows} linhas detectadas.`);
  }

  return {
    source:"PRF/SC",
    official:true,
    lotCount:parsed.lots.length,
    sourceRowCount:parsed.sourceRows,
    documentUsed:{
      name:"PRF/SC — Anexo I — relação oficial de lotes",
      url:candidate.url,
      pageUrl:page.toString(),
      source:"PRF/SC"
    },
    diagnostics:[{
      file:"PRF/SC — Anexo I",
      bytes:bytes.byteLength,
      pages:parsedPdf.numpages||null,
      textChars:String(parsedPdf.text||"").length,
      textLayout:"row-aware",
      lots:parsed.lots.length,
      sourceRows:parsed.sourceRows,
      failures:parsed.failures.slice(0,20),
      sourceUrl:candidate.url
    }],
    items:[],
    files:links.slice(0,10).map(x=>({url:x.url,score:x.score})),
    lots:parsed.lots,
    importedAt:new Date().toISOString()
  };
}

Deno.serve(async (req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors(req)});
  if(req.method!=="POST") return json(req,{error:"Use POST."},405);

  let activeRun:any={admin:null,runId:"",sourceId:"",resultId:"",reference:""};
  try{
    const auth=await requireConfirmedUser(req);
    if(auth.response) return auth.response;

    const body=await req.json();
    const sourceId=String(body?.sourceId||"pncp").trim().toLowerCase() || "pncp";
    const connector=String(body?.connector||"").trim().toLowerCase();
    const resultId=String(body?.resultId||"").trim();
    const reference=String(body?.reference||"").trim();
    const fallbackUrl=String(body?.fallbackUrl||"").trim();
    const run=await startSourceRun(
      sourceId,
      resultId || reference || fallbackUrl || "consulta oficial",
      {
        resultId:resultId||null,
        reference:reference||null,
        requestedBy:auth.user?.id||null,
        connector:"pncp-lots"
      }
    );
    activeRun={...run,sourceId,resultId,reference};

    if(connector==="prf-pdf"){
      if(sourceId!=="prf-sc"){
        await finishSourceRun(run.admin,run.runId,"error",0,"Conector PRF fora da fonte cadastrada.",{resultId});
        return json(req,{error:"Conector PRF permitido somente para a fonte PRF/SC cadastrada."},400);
      }
      if(!fallbackUrl){
        await finishSourceRun(run.admin,run.runId,"error",0,"URL oficial da PRF não informada.",{resultId});
        return json(req,{error:"URL oficial da PRF não informada."},400);
      }
      try{
        const result=await fetchPrfLots(fallbackUrl);
        const documentId=await recordSourceDocument(
          run.admin,sourceId,result.documentUsed,reference,
          {resultId,lotCount:result.lotCount||0,connector:"prf-sc"}
        );
        await finishSourceRun(
          run.admin,run.runId,
          (result.lotCount||0)>0 ? "success" : "no_results",
          result.lotCount||0,
          "",
          {resultId,documentId:documentId||null,documentUsed:result.documentUsed||null}
        );
        return json(req,{...result,sourceRunId:run.runId||null,sourceDocumentId:documentId||null});
      }catch(error){
        await finishSourceRun(
          run.admin,run.runId,"error",0,String(error?.message||error),
          {resultId,reference}
        );
        throw error;
      }
    }

    if(connector && connector!=="pncp" && connector!=="pncp-detran"){
      await finishSourceRun(run.admin,run.runId,"error",0,"Conector oficial não reconhecido.",{resultId,reference});
      return json(req,{error:"Conector oficial não reconhecido."},400);
    }

    const cnpj=digits(body?.cnpj);
    const year=safeYear(body?.year);
    const sequence=safeSeq(body?.sequence);
    if(cnpj.length!==14 || !year || !sequence){
      await finishSourceRun(run.admin,run.runId,"error",0,"cnpj, year e sequence inválidos.",{resultId,reference});
      return json(req,{error:"cnpj, year e sequence inválidos."},400);
    }

    const root=`${PNCP_BASE}/orgaos/${cnpj}/compras/${year}/${sequence}`;
    const [itemsRaw,filesRaw]=await Promise.all([
      fetchJson(root+"/itens").catch(error=>({__error:String(error)})),
      fetchJson(root+"/arquivos")
    ]);
    const items=asArray(itemsRaw);
    const files=asArray(filesRaw).map((file,index)=>({
      ...file,
      __sequence:fileSeq(file,index),
      __name:fileName(file),
      __score:scoreFile(file)
    })).sort((a,b)=>b.__score-a.__score);

    const diagnostics:any[]=[];
    let lots:any[]=[];
    let documentUsed:any=null;

    for(const file of files.slice(0,4)){
      if(file.__score<40) continue;
      const url=`${root}/arquivos/${file.__sequence}`;
      try{
        const response=await fetch(url,{headers:{"Accept":"application/pdf,*/*","User-Agent":"SistemaThiago/1.0"}});
        if(!response.ok){
          diagnostics.push({file:file.__name,sequence:file.__sequence,status:response.status});
          continue;
        }
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.byteLength>20*1024*1024){
          diagnostics.push({file:file.__name,sequence:file.__sequence,error:"arquivo maior que 20 MB"});
          continue;
        }
        const parsedPdf=await pdf(Buffer.from(bytes));
        const extracted=parseLots(String(parsedPdf.text||""));
        diagnostics.push({
          file:file.__name,sequence:file.__sequence,bytes:bytes.byteLength,
          pages:parsedPdf.numpages||null,textChars:String(parsedPdf.text||"").length,lots:extracted.length
        });
        if(extracted.length>lots.length){
          lots=extracted;
          documentUsed={name:file.__name,sequence:file.__sequence,url};
        }
        if(lots.length>=5) break;
      }catch(error){
        diagnostics.push({file:file.__name,sequence:file.__sequence,error:String(error)});
      }
    }


    const expectedIndividual=Math.max(0,...items.map((x:any)=>Number(x?.quantidade)||0));

    if(fallbackUrl && lots.length < expectedIndividual){
      try{
        const page=new URL(fallbackUrl);
        const allowed=page.protocol==="https:" && (page.hostname==="www.detran.sc.gov.br" || page.hostname==="detran.sc.gov.br");
        if(!allowed) throw new Error("fallback fora do domínio oficial DETRAN/SC");

        const pageResponse=await fetch(page.toString(),{headers:{"Accept":"text/html","User-Agent":"SistemaThiago/1.0"}});
        if(!pageResponse.ok) throw new Error(`DETRAN respondeu ${pageResponse.status} ao abrir a página do edital`);
        const html=await pageResponse.text();
        const match=html.match(/data-downloadurl=["']([^"']+)["']/i);
        if(!match) throw new Error("link oficial de download não encontrado na página DETRAN");

        const downloadUrl=match[1].replaceAll("&amp;","&");
        const pdfResponse=await fetch(downloadUrl,{
          redirect:"follow",
          headers:{"Accept":"application/pdf,*/*","User-Agent":"SistemaThiago/1.0"}
        });
        if(!pdfResponse.ok) throw new Error(`DETRAN respondeu ${pdfResponse.status} ao baixar o edital`);
        const bytes=new Uint8Array(await pdfResponse.arrayBuffer());
        if(bytes.byteLength>20*1024*1024) throw new Error("arquivo DETRAN maior que 20 MB");

        const parsedPdf=await pdf(Buffer.from(bytes));
        const extracted=parseLots(String(parsedPdf.text||""));
        diagnostics.push({
          file:"DETRAN/SC — edital descritivo completo",
          sequence:null,
          bytes:bytes.byteLength,
          pages:parsedPdf.numpages||null,
          textChars:String(parsedPdf.text||"").length,
          lots:extracted.length,
          sourceUrl:page.toString()
        });
        if(extracted.length>lots.length){
          lots=extracted;
          documentUsed={
            name:"DETRAN/SC — edital descritivo completo",
            sequence:null,
            url:page.toString(),
            source:"DETRAN/SC"
          };
        }
      }catch(error){
        diagnostics.push({
          file:"DETRAN/SC — fallback",
          sequence:null,
          error:String(error?.message||error),
          sourceUrl:fallbackUrl
        });
      }
    }

    const documentId=await recordSourceDocument(
      run.admin,sourceId,documentUsed,reference,
      {
        resultId,
        connector:"pncp",
        pncpControl:`${cnpj}-1-${String(sequence).padStart(6,"0")}/${year}`,
        lotCount:lots.length
      }
    );
    const hasDiagnosticError=diagnostics.some(d=>Boolean(d?.error || (d?.status && Number(d.status)>=400)));
    const runStatus=lots.length
      ? (hasDiagnosticError ? "partial" : "success")
      : (hasDiagnosticError ? "partial" : "no_results");
    await finishSourceRun(
      run.admin,run.runId,runStatus,lots.length,"",
      {resultId,reference,documentId:documentId||null,documentUsed:documentUsed||null}
    );

    return json(req,{
      source:"PNCP",
      official:true,
      lotCount:lots.length,
      itemCount:items.length,
      fileCount:files.length,
      documentUsed,
      sourceRunId:run.runId||null,
      sourceDocumentId:documentId||null,
      diagnosticSummary:diagnostics.map(d=>({
        file:d.file||'',
        sequence:d.sequence||null,
        status:d.status||null,
        pages:d.pages||null,
        textChars:d.textChars||null,
        lots:d.lots||0,
        error:d.error||''
      })),
      pncpControl:`${cnpj}-1-${String(sequence).padStart(6,"0")}/${year}`,
      items,
      files:files.map(({__score,...file})=>file),
      lots,
      diagnostics,
      importedAt:new Date().toISOString()
    });
  }catch(error){
    const message=String(error?.message||error);
    await finishSourceRun(
      activeRun.admin,activeRun.runId,"error",0,message,
      {
        resultId:activeRun.resultId||null,
        reference:activeRun.reference||null,
        sourceId:activeRun.sourceId||null,
        unexpected:true
      }
    );
    console.error("PNCP_LOTS_ERROR",String(error?.stack||message));
    return json(req,{error:message},502);
  }
});
