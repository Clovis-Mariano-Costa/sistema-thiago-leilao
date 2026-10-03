(()=>{
  const KEY='sistema-thiago-storage-notice-v1';
  if(localStorage.getItem(KEY)==='ack') return;
  const box=document.createElement('aside');
  box.className='cookie-notice';
  box.setAttribute('role','dialog');
  box.setAttribute('aria-label','Aviso de armazenamento e privacidade');
  box.innerHTML='<p><strong>Privacidade:</strong> usamos apenas armazenamento essencial ao funcionamento e à autenticação neste beta. Não ativamos cookies de publicidade ou analytics nesta etapa. <a href="cookies.html">Saiba mais</a> · <a href="privacidade.html">Privacidade</a></p><button type="button">Entendi</button>';
  box.querySelector('button').addEventListener('click',()=>{
    localStorage.setItem(KEY,'ack');
    box.remove();
  });
  document.body.appendChild(box);
})();