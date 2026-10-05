const PRF_LOT_START=/^\s*(\d{1,4})\s*(\d{2}\/\d{2}\/\d{2})(?=\s)/gm;
const PRF_PLATE=/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|S\/?\s*PLACA|SEM\s*PLACA)\s+([A-Z]{2})\s+/i;
const PRF_STATUS=/(Circula(?:ç|c)[aã]o(?:\s+com\s+motor\s+(?:a\s+regularizar|aproveit[aá]vel|inserv[ií]vel))?|Sucata\s+aproveit[aá]vel(?:\s*(?:-\s*)?motor\s+(?:aproveit[aá]vel|inserv[ií]vel))?|Sucata\s+inserv[ií]vel)/i;
const PRF_TYPE_END=/(Autom[oó]vel|Motocicleta|Motoneta|Caminhonete|Camioneta|Ciclomotor|Reboque(?:\/S\.R\.)?|Semi-?reboque|Semirreboque|[ÔO]nibus|Micro-?[oô]nibus|Utilit[aá]rio|Triciclo|Quadriciclo|Caminh[aã]o(?:\s+Trator)?|Trator(?:\s+de\s+rodas)?|Especial|Misto)\s*$/i;

export function prfMoney(value){
  return String(value||"").replace(/[^0-9,.-]/g,"");
}

export function extractPrfMinimumBid(value){
  const row=String(value||"").replace(/\s+/g," ").trim();

  // O PDF real frequentemente desloca "R$" para antes ou depois da célula,
  // mas o valor com centavos continua preservado. Não dependemos do status
  // ("Cir culaç ão", "Suc ata", etc.) para localizar a coluna monetária.
  const decimals=[...row.matchAll(/(?:R\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})(?:\s*R\$)?/gi)];
  if(decimals.length){
    return prfMoney(decimals[decimals.length-1]?.[1]||"");
  }

  // Duas linhas reais do Anexo I perderam ",00" na extração textual.
  // Nesses casos aceitamos somente inteiro imediatamente associado ao
  // marcador administrativo "DEL 8/6", evitando confundir ano/RENAVAM.
  const integerBeforeDel=row.match(/\b([0-9]{2,6})\s+(?:(?:DOCA|CALDERAN|SUDE\s*STE|TET\s*O)\s*-\s*)?DEL\s+8\/6\b/i)
    || row.match(/\b([0-9]{2,6})\s+DEL\s+8\/6\b/i);
  return integerBeforeDel ? prfMoney(integerBeforeDel[1]) : "";
}

export function preparePrfText(value){
  return String(value||"")
    .replace(/\u00a0/g," ")
    .replace(/\r/g,"\n")
    .replace(/(\d{1,3}(?:\.\d{3})*,\d{2})(?=\d{1,4}\s*\d{2}\/\d{2}\/\d{2})/g,"$1\n")
    .replace(/[ \t]+\n/g,"\n")
    .replace(/\n[ \t]+/g,"\n");
}

export async function renderPdfRows(pageData){
  const content=await pageData.getTextContent({normalizeWhitespace:true,disableCombineTextItems:false});
  const items=(Array.isArray(content?.items)?content.items:[])
    .map(item=>({
      text:String(item?.str||"").replace(/\s+/g," ").trim(),
      x:Number(item?.transform?.[4]||0),
      y:Number(item?.transform?.[5]||0)
    }))
    .filter(item=>item.text)
    .sort((a,b)=>Math.abs(b.y-a.y)>1.6 ? b.y-a.y : a.x-b.x);

  const rows=[];
  for(const item of items){
    let row=rows.find(candidate=>Math.abs(candidate.y-item.y)<=1.6);
    if(!row){
      row={y:item.y,items:[]};
      rows.push(row);
    }
    row.items.push(item);
  }

  rows.sort((a,b)=>b.y-a.y);
  return rows.map(row=>
    row.items.sort((a,b)=>a.x-b.x).map(item=>item.text).join(" ")
  ).join("\n");
}

export function parsePrfLots(rawText){
  const text=preparePrfText(rawText);
  const starts=[...text.matchAll(PRF_LOT_START)];
  const lots=[];
  const failures=[];

  for(let i=0;i<starts.length;i++){
    const match=starts[i];
    const blockStart=match.index||0;
    const blockEnd=i+1<starts.length ? (starts[i+1].index||text.length) : text.length;
    const block=text.slice(blockStart,blockEnd).replace(/\s+/g," ").trim();
    const lotNumber=Number(match[1]);
    const auctionDate=String(match[2]||"");
    const warnings=[];

    let plate="";
    let uf="";
    let brandModel="";
    let type="";
    let chassis="";
    let renavam="";
    let year="";
    let color="";
    let statusAvaliacao="";
    let minimumBid="";
    let entryDate="";
    let context="";

    minimumBid=extractPrfMinimumBid(block);

    const plateMatch=block.match(PRF_PLATE);
    if(plateMatch && plateMatch.index!=null){
      plate=plateMatch[1].replace(/\s+/g,"").toUpperCase();
      uf=plateMatch[2].toUpperCase();

      const prefix=block.slice(0,plateMatch.index).trim();
      context=prefix.replace(/^\d{1,4}\s*\d{2}\/\d{2}\/\d{2}\s*/,"").slice(0,500);
      const dates=[...prefix.matchAll(/\b\d{2}\/\d{2}\/\d{2}\b/g)].map(x=>x[0]);
      entryDate=dates.length>1 ? dates[dates.length-1] : "";

      const afterPlate=block.slice(plateMatch.index+plateMatch[0].length).trim();
      const statusMatch=afterPlate.match(PRF_STATUS);
      if(statusMatch && statusMatch.index!=null){
        statusAvaliacao=statusMatch[0].replace(/\s+/g," ").trim();
        const beforeStatus=afterPlate.slice(0,statusMatch.index).trim();
        const technicalMatch=beforeStatus.match(/^(.*)\s+(\S+)\s+(\d{1,14})\s+(\d{4})\s+(.+)$/);

        if(technicalMatch){
          let modelAndType=technicalMatch[1].trim();
          chassis=technicalMatch[2];
          renavam=technicalMatch[3];
          year=technicalMatch[4];
          color=technicalMatch[5].trim();

          const typeMatch=modelAndType.match(PRF_TYPE_END);
          type=typeMatch ? typeMatch[0].trim() : "";
          brandModel=typeMatch
            ? modelAndType.slice(0,modelAndType.length-typeMatch[0].length).trim()
            : modelAndType;
          if(!type) warnings.push("tipo de veículo não identificado separadamente");
        }else{
          warnings.push("campos técnicos não totalmente reconciliados");
        }

        if(!minimumBid) warnings.push("valor avaliado não localizado");
      }else{
        warnings.push("status de avaliação não localizado");
        if(!minimumBid) warnings.push("valor avaliado não localizado");
      }
    }else{
      warnings.push("placa/UF não localizados");
      context=block.slice(0,500);
    }

    const lot={
      n:lotNumber,
      auctionDate,
      entryDate,
      plate,
      uf,
      brandModel,
      vehicle:brandModel || `Lote oficial ${lotNumber}`,
      type,
      chassis,
      renavam,
      year,
      color,
      statusAvaliacao,
      minimumBid,
      context,
      sourceType:"official",
      needsReview:true,
      parserWarnings:warnings,
      rawOfficialRow:block
    };

    lots.push(lot);
    if(warnings.length) failures.push({lot:lotNumber,plate,reason:warnings.join("; ")});
  }

  const unique=new Map();
  for(const lot of lots){
    if(!unique.has(lot.n)) unique.set(lot.n,lot);
  }

  return {
    lots:[...unique.values()].sort((a,b)=>a.n-b.n),
    sourceRows:starts.length,
    failures
  };
}

export function scorePrfPdfUrl(url){
  const s=String(url||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  let score=0;
  if(s.includes("anexo-i")) score+=100;
  if(s.includes("anexo")) score+=40;
  if(s.includes("edital")) score+=20;
  if(s.includes("errata")) score-=50;
  if(s.includes("informativo")) score-=30;
  return score;
}
