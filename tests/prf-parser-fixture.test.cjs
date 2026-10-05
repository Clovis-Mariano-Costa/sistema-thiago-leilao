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


test('Edge Function não contém escapes literais entre declarações PRF',()=>{
  const fs=require('node:fs');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.doesNotMatch(edge,/PRF_HOSTS=.*;\\\\n\\\\nasync function fetchPrfLots/);
  assert.match(edge,/PRF_HOSTS=.*;\n\nasync function fetchPrfLots/);
});
