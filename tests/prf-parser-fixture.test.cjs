const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

async function parser(){
  return import(pathToFileURL(path.resolve('supabase/functions/pncp-lots/prf-parser.mjs')).href);
}

test('parser PRF reconcilia linhas reais do Anexo I',async()=>{
  const {parsePrfLots}=await parser();
  const sample=`
1 05/10/26
DEL 8/6
MAFRA
DOCA -
CANOINHAS Canoinhas 02/02/26 MDO2849 SC PEUGEOT/206 14 PRESENC Automóvel 9362AKFW95B007060 840516290 2004 PRETA Circulação
R$
2.900,00
654 05/10/26
DEL 8/6
MAFRA
G8 RIO
NEGRINHO Rio Negrinho 01/06/23 MIK1F62 SC NISSAN/LIVINA 16S Automóvel 94DTAFL10CJ766353 310477646 2011 PRATA
Circulação
com motor
a
regularizar
R$
2.200,00
1107 06/10/26
DEL 8/6
MAFRA
G8 RIO
NEGRINHO Rio Negrinho 01/06/23 QWS2E27 SC FORD/KA SE 1.0 SD C Automóvel 9BFZH54L9L8419980 1209792653 2019 PRETA
Sucata
aproveitável
- motor
inservível R$ 850,00
`;
  const parsed=parsePrfLots(sample);
  assert.equal(parsed.sourceRows,3);
  assert.equal(parsed.lots.length,3);
  assert.equal(parsed.failures.length,0);

  assert.deepEqual(
    {
      n:parsed.lots[0].n,plate:parsed.lots[0].plate,brandModel:parsed.lots[0].brandModel,
      type:parsed.lots[0].type,minimumBid:parsed.lots[0].minimumBid
    },
    {n:1,plate:'MDO2849',brandModel:'PEUGEOT/206 14 PRESENC',type:'Automóvel',minimumBid:'2.900,00'}
  );
  assert.equal(parsed.lots[1].statusAvaliacao,'Circulação com motor a regularizar');
  assert.equal(parsed.lots[1].minimumBid,'2.200,00');
  assert.equal(parsed.lots[2].statusAvaliacao,'Sucata aproveitável - motor inservível');
  assert.equal(parsed.lots[2].minimumBid,'850,00');
});

test('renderizador PRF recompõe células pela coordenada Y',async()=>{
  const {renderPdfRows}=await parser();
  const page={
    async getTextContent(){
      return {items:[
        {str:'MDO2849',transform:[1,0,0,1,200,700]},
        {str:'1',transform:[1,0,0,1,10,720]},
        {str:'05/10/26',transform:[1,0,0,1,40,720]},
        {str:'SC',transform:[1,0,0,1,260,700]},
        {str:'PEUGEOT/206',transform:[1,0,0,1,300,700]}
      ]};
    }
  };
  const text=await renderPdfRows(page);
  assert.equal(text.split('\n')[0],'1 05/10/26');
  assert.equal(text.split('\n')[1],'MDO2849 SC PEUGEOT/206');
});


test('Edge Function preserva declaração PRF sem escapes literais e com allowlist ativa',()=>{
  const fs=require('node:fs');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.doesNotMatch(edge,/PRF_HOSTS=.*;\\\\n/);
  assert.match(edge,/const PRF_HOSTS=new Set\(\["www\.gov\.br","gov\.br"\]\);/);
  assert.match(edge,/fetchOfficialWithRedirects\(page,PRF_HOSTS/);
  assert.match(edge,/fetchOfficialWithRedirects\(candidate\.url,PRF_HOSTS/);
});


test('parser PRF preserva lote mesmo quando uma linha tem campos incompletos',async()=>{
  const {parsePrfLots}=await parser();
  const sample=`
1332 07/10/26
DEL 8/6
MAFRA
PATIO EXEMPLO Cidade 01/01/26 ABC1D23 SC MODELO INCOMUM SEM CAMPOS SUFICIENTES Sucata inservível R$ 1,00
1333 07/10/26
DEL 8/6
MAFRA
PATIO EXEMPLO Cidade 01/01/26 XYZ9Z99 SC VW/GOL Automóvel 9BWZZZ12345678901 123456789 2000 PRETA Sucata inservível R$ 180,00
`;
  const parsed=parsePrfLots(sample);
  assert.equal(parsed.sourceRows,2);
  assert.equal(parsed.lots.length,2);
  assert.equal(parsed.lots[0].n,1332);
  assert.equal(parsed.lots[0].needsReview,true);
  assert.ok(parsed.lots[0].rawOfficialRow);
  assert.equal(parsed.lots[1].n,1333);
});


test('ST-MNM-44D recupera valor mínimo das linhas OCR reais da PRF',async()=>{
  const {extractPrfMinimumBid,parsePrfLots}=await parser();
  const rows=[
    ['1 05/10/26 MAFRA CANOINHAS Canoinhas 02/02/26 MDO2849 SC PEUGE OT/206 14 PRE SENC Aut omó vel 9362AKFW95B007060 840516290 2004 PRET A Cir culaç ão 2.900,00 DEL 8/6 DOCA - R$','2.900,00'],
    ['7 05/10/26 CHAPE CÓ XANXERÊ Chapec ó 26/07/25 HQO1D42 SC HOND A/C G 125 T OD AY Mot ocicle ta 9C2JC1801MR584066 132015277 1991 VERMELHA Cir culaç ão R$ 930,00 DEL 8/6 CALDERAN R$','930,00'],
    ['334 05/10/26 CHAPE CÓ MARA VILHA Mar avilha 14/11/25 MBB1268 SC HOND A/C100 BIZ Mot one ta 9C2HA070XWR002748 708693032 1998 AZUL Cir culaç ão 1080 DEL 8/6 SUDE STE -','1080'],
    ['757 06/10/26 CHAPE CÓ XANXERÊ Chapec ó 24/05/23 AOF6093 SC VW/GOL 1.0 Aut omó vel 9B WCA05W17T020389 901351849 2006 PRA TA apr oveit ável 850 DEL 8/6 CALDERAN Suc ata','850'],
    ['1000 06/10/26 CHAPE CÓ XANXERÊ Chapec ó 12/10/23 MA C9F86 SC VW/GOL 16V Aut omó vel 9B WZZZ373WT129364 703522680 1998 VERDE inser vív el R$ 700,00 Suc ata apr oveit ável DEL 8/6 CALDERAN - mot or','700,00']
  ];
  for(const [row,expected] of rows) assert.equal(extractPrfMinimumBid(row),expected);

  const parsed=parsePrfLots(rows.map(([row])=>row).join('\n'));
  assert.equal(parsed.lots.length,rows.length);
  assert.deepEqual(parsed.lots.map(lot=>lot.minimumBid),rows.map(([,expected])=>expected));
});
