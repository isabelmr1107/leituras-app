"use client";

import {useEffect, useState} from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: "accepted" | "dismissed"}>;
};

export default function PwaInstall({visible}: {visible:boolean}) {
  const [promptEvent,setPromptEvent]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false);
  const [isIOS,setIsIOS]=useState(false);
  const [isSafari,setIsSafari]=useState(false);
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    if (typeof window === "undefined") return;
    const agent = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(agent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
    setIsIOS(ios);
    setIsSafari(/Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Edg/.test(agent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    const capture = (event:Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    const onInstalled = () => {setInstalled(true);setPromptEvent(null);setNotice("LIO instalado com sucesso!");};
    window.addEventListener("beforeinstallprompt",capture);
    window.addEventListener("appinstalled",onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{});
    }
    return ()=>{
      window.removeEventListener("beforeinstallprompt",capture);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  async function install(){
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome==="accepted") setNotice("Solicitação de instalação enviada. Confira a tela inicial do seu dispositivo.");
    } catch {
      setNotice("Não foi possível abrir a instalação automática. Use a opção de instalar do navegador.");
    }
  }

  return <section className="lio-pwa-card" hidden={!visible} aria-label="Instalar o aplicativo LIO">
    <div className="lio-pwa-icon" aria-hidden="true">lio<span>✦</span></div>
    <div className="lio-pwa-copy">
      <span className="section-kicker">✦ LEVE O LIO COM VOCÊ</span>
      <h3>Instale o LIO no seu celular</h3>
      <p>Use sua mesma conta e estante em uma janela de aplicativo, com um ícone na tela inicial. Você continua precisando de internet para acessar e salvar seus livros.</p>
      {installed?<p role="status" className="lio-pwa-status">✓ Você já está usando o LIO como aplicativo.</p>:promptEvent?<button className="primary" type="button" onClick={install}>↗ Instalar LIO</button>:isIOS?<p className="lio-pwa-steps">{isSafari?"No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.":"No iPhone, abra esta página no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início."}</p>:<p className="lio-pwa-steps">No navegador, procure no menu a opção Instalar aplicativo ou Adicionar à tela inicial. Se não aparecer, seu navegador pode não oferecer instalação nesta página.</p>}
      {notice&&<p role="status" className="lio-pwa-status">{notice}</p>}
    </div>
  </section>;
}
