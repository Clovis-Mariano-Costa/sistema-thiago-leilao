import pdf from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";

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

Deno.serve(async (req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors(req)});
  if(req.method!=="POST") return json(req,{error:"Use POST."},405);

  try{
    const body=await req.json();
    const cnpj=digits(body?.cnpj);
    const year=safeYear(body?.year);
    const sequence=safeSeq(body?.sequence);
    if(cnpj.length!==14 || !year || !sequence){
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

    return json(req,{
      source:"PNCP",
      official:true,
      lotCount:lots.length,
      itemCount:items.length,
      fileCount:files.length,
      documentUsed,
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
    return json(req,{error:String(error?.message||error)},502);
  }
});
