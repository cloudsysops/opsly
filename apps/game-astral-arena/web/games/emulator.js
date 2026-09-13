const SYSTEMS = {
  nes: { core:'nes', coreImpl:'fceumm', license:'GPL-2.0', extensions:['nes','zip'] },
  gb: { core:'gb', coreImpl:'gambatte', license:'GPL-2.0', extensions:['gb','gbc','zip'] },
  gba: { core:'gba', coreImpl:'mgba', license:'MPL-2.0', extensions:['gba','zip'] },
  atari2600: { core:'atari2600', coreImpl:'stella2014', license:'GPL-2.0', extensions:['a26','bin','zip'] },
};
let objectUrl = null;

document.querySelector('#start').addEventListener('click', () => {
  const systemKey = document.querySelector('#system').value;
  const file = document.querySelector('#rom').files?.[0];
  const rights = document.querySelector('#rights').checked;
  const status = document.querySelector('#status');
  const system = SYSTEMS[systemKey];

  if (!rights) { status.textContent='⚠️ Confirma que tienes derecho a usar el archivo.'; return; }
  if (!file) { status.textContent='⚠️ Selecciona un archivo local.'; return; }

  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if (!system.extensions.includes(ext)) {
    status.textContent=`⚠️ Extensión .${ext} no permitida para ${systemKey}. Permitidas: ${system.extensions.join(', ')}`;
    return;
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);

  window.EJS_player = '#game';
  window.EJS_core = system.core;
  window.EJS_gameUrl = objectUrl;
  window.EJS_gameName = file.name.replace(/\.[^.]+$/,'');
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_color = '#8a5cff';

  status.textContent=`✅ Abriendo localmente con ${system.coreImpl} (${system.license}).`;
  document.querySelector('#loader-box').style.display='none';

  const script=document.createElement('script');
  script.src='https://cdn.emulatorjs.org/stable/data/loader.js';
  script.async=true;
  script.onerror=()=>{status.textContent='No se pudo cargar EmulatorJS desde el CDN oficial.';};
  document.body.appendChild(script);
});

window.addEventListener('beforeunload',()=>{ if(objectUrl) URL.revokeObjectURL(objectUrl); });
