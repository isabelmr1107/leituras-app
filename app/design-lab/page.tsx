"use client";
import {useState} from "react";
import styles from "./design-lab.module.css";

type Section="Início"|"Estante"|"Diário"|"Cronograma";
const shelf=[
  {title:"A vida invisível de Addie LaRue",author:"V. E. Schwab",tone:"lavender",symbol:"✦",num:"01",status:"Lendo",progress:42},
  {title:"Tudo é rio",author:"Carla Madeira",tone:"coral",symbol:"≈",num:"02",status:"Quero ler",progress:0},
  {title:"Os sete maridos de Evelyn Hugo",author:"Taylor Jenkins Reid",tone:"sage",symbol:"◒",num:"03",status:"Lido",progress:100}
] as const;
const tabs:Section[]=["Início","Estante","Diário","Cronograma"];
export default function DesignLab(){
  const [section,setSection]=useState<Section>("Início");
  const [night,setNight]=useState(true);
  const [showNote,setShowNote]=useState(false);
  const [pages,setPages]=useState("400");
  const [days,setDays]=useState("7");
  const target=Math.ceil(Math.max(0,Number(pages)||0)/Math.max(1,Math.floor(Number(days)||1)));
  return <div className={styles.lab} data-mode={night?"night":"day"}>
    <div className={styles.topTape}><span>✳ LABORATÓRIO DE DESIGN · CONCEITO EXPERIMENTAL</span><span>Dados fictícios · nada é salvo</span></div>
    <div className={styles.frame}>
      <aside className={styles.rail}>
        <div className={styles.brand}><div className={styles.brandWord}>lio<span>✳</span></div><div className={styles.brandCaption}>O SEU UNIVERSO DE LIVROS</div></div>
        <div className={styles.railDivider}><span>EDIÇÃO Nº 01</span><span>2026</span></div>
        <nav className={styles.nav} aria-label="Navegação da demonstração">
          {tabs.map((tab,i)=><button type="button" key={tab} onClick={()=>setSection(tab)} className={section===tab?styles.navActive:styles.navButton}><span className={styles.navCount}>0{i+1}</span><span>{tab}</span><span className={styles.navArrow}>↗</span></button>)}
        </nav>
        <div className={styles.railBottom}><div className={styles.roundMark}>L<br/>I<br/>O</div><p>Porque cada página merece um lugar especial.</p><button type="button" className={styles.themeButton} onClick={()=>setNight(v=>!v)}>{night?"☼ Testar modo claro":"☾ Testar modo escuro"}</button></div>
      </aside>
      <main className={styles.content}>
        <header className={styles.header}><span>SEU REFÚGIO LITERÁRIO <span className={styles.star}>✳</span></span><div className={styles.headerRight}><span className={styles.date}>CAPÍTULO 11 / 2026</span><span className={styles.profileBadge}>L</span></div></header>
        {section==="Início"&&<>
          <div className={styles.hero}>
            <div className={styles.heroCopy}><p className={styles.overline}>OLÁ, LEITOR(A) · SUA PÁGINA ESTÁ ABERTA</p><h1>Viver é <em>colecionar</em> histórias<span className={styles.headingStar}>✳</span></h1><p>Entre capítulos, xícaras de café e finais inesquecíveis, este é o seu lugar no mundo.</p><button type="button" className={styles.inkButton} onClick={()=>setSection("Estante")}>Explorar minha estante <span>↗</span></button></div>
            <div className={styles.heroArt}><div className={styles.artHalo}></div><div className={styles.artBookBack}></div><div className={styles.artBook}><span>EDIÇÃO<br/>DO CORAÇÃO</span><span className={styles.artBookSymbol}>✷</span><strong>Histórias<br/>que ficam</strong><small>UM CAPÍTULO DE CADA VEZ</small></div><div className={styles.artOrbit}>✦</div><div className={styles.artCaption}>PARA ALÉM DA ÚLTIMA PÁGINA</div></div>
          </div>
          <div className={styles.marquee}><span>✦ HISTÓRIAS PARA GUARDAR</span><span>✳ UM LIVRO DE CADA VEZ</span><span>✦ O MUNDO CABE EM PÁGINAS</span></div>
          <div className={styles.indexHeader}><div><span className={styles.sectionIndex}>01 / A SUA HISTÓRIA</span><h2>Na estante <em>agora</em></h2></div><button type="button" className={styles.textLink} onClick={()=>setSection("Estante")}>VER TODAS ↗</button></div>
          <div className={styles.metrics}><div><span className={styles.metricLabel}>LIVROS NA ESTANTE</span><strong>24</strong><span className={styles.metricNote}>mundos para visitar ↗</span></div><div><span className={styles.metricLabel}>LIDOS ESTE ANO</span><strong>08</strong><span className={styles.metricNote}>memórias colecionadas</span></div><div><span className={styles.metricLabel}>DIAS DE LEITURA</span><strong>12<span className={styles.metricSymbol}>✷</span></strong><span className={styles.metricNote}>cada dia conta</span></div></div>
          <div className={styles.featureRow}><div className={styles.featureHeadline}><span className={styles.sectionIndex}>02 / LENDO AGORA</span><h2>Entre <em>linhas</em><br/>e mundos.</h2><p>Um pequeno lembrete: continuar uma história também é uma forma de se encontrar.</p><button type="button" className={styles.textLink} onClick={()=>setSection("Cronograma")}>CONTINUAR LEITURA ↗</button></div><div className={styles.featureTicket}><div className={styles.ticketTop}>MARCADOR DE PÁGINA <span>✳</span></div><div className={styles.ticketBody}><span>NO MEIO DE UMA HISTÓRIA</span><strong>A vida invisível<br/>de Addie LaRue</strong><small>V. E. Schwab</small><div className={styles.ticketProgress}><i style={{width:"42%"}}/></div><b>42% DA JORNADA</b></div></div></div>
        </>}
        {section==="Estante"&&<>
          <div className={styles.innerIntro}><span className={styles.overline}>01 / SUA BIBLIOTECA PARTICULAR</span><h1>Um mundo <em>na estante.</em></h1><p>Histórias que chegaram, ficaram e transformaram suas páginas.</p><div className={styles.cornerFlourish}>✳</div></div>
          <div className={styles.libraryLead}><span>CATÁLOGO AFETIVO · 03 EXEMPLARES DE DEMONSTRAÇÃO</span><span>ORDENADOS POR HISTÓRIA ↗</span></div>
          <div className={styles.bookGrid}>{shelf.map(book=><article className={styles.bookCard} key={book.num}><div className={styles.cover+" "+styles[book.tone]}><span className={styles.coverNumber}>LIO COLLECTION · {book.num}</span><span className={styles.coverSymbol}>{book.symbol}</span><b>{book.title}</b><small>{book.author}</small></div><div className={styles.bookCardBottom}><span>{book.status} · {book.progress}%</span><span>✦</span></div></article>)}</div>
          <div className={styles.mutedFoot}>✳ Visual experimental com livros fictícios de exemplo. Nenhuma biblioteca real foi modificada.</div>
        </>}
        {section==="Diário"&&<>
          <div className={styles.innerIntro}><span className={styles.overline}>02 / MEMÓRIAS EM PALAVRAS</span><h1>O que as <em>páginas</em> disseram.</h1><p>Um espaço para guardar os pensamentos que nascem durante a leitura.</p><div className={styles.cornerFlourish}>❝</div></div>
          <div className={styles.diaryGrid}><article className={styles.diaryPage}><span className={styles.sectionIndex}>DIÁRIO Nº 001 · UM EXEMPLO</span><div className={styles.diaryQuote}>“Algumas histórias terminam no papel. Outras continuam dentro da gente.”</div><div className={styles.diaryByline}>NOTA DE LEITURA — 03 NOV 2026 <span>✳</span></div></article><div className={styles.diarySide}><div className={styles.diaryStamp}>LIO<br/><span>CLUBE DAS</span><br/>PÁGINAS</div><h2>Palavras <em>que ficam.</em></h2><p>Seu diário real continuará protegido. Esta página apresenta apenas uma direção visual para o futuro do LIO.</p><button type="button" className={styles.inkButton} onClick={()=>setShowNote(v=>!v)}>{showNote?"Fechar bilhete":"Abrir bilhete"} <span>↗</span></button>{showNote&&<p className={styles.demoNote}>Este é um bilhete de demonstração, sem salvamento de dados.</p>}</div></div>
        </>}
        {section==="Cronograma"&&<>
          <div className={styles.innerIntro}><span className={styles.overline}>03 / CADA PÁGINA TEM SEU TEMPO</span><h1>Ritmo de <em>leitura.</em></h1><p>Metas que cabem na sua vida, sem transformar o prazer de ler em obrigação.</p><div className={styles.cornerFlourish}>◷</div></div>
          <div className={styles.plannerGrid}><article className={styles.plannerLeft}><span className={styles.sectionIndex}>A CALCULADORA LITERÁRIA</span><h2>Quanto ler <em>por dia?</em></h2><label>Total de páginas<input type="number" min={1} max={100000} value={pages} onChange={e=>setPages(e.target.value)}/></label><label>Quantos dias você tem?<input type="number" min={1} max={3650} value={days} onChange={e=>setDays(e.target.value)}/></label><div className={styles.plannerAnswer}><span>SUA META</span><strong>{target}</strong><b>PÁGINAS / DIA</b></div></article><aside className={styles.plannerRight}><div className={styles.ticketTop}>BILHETE DE LEITURA <span>↗</span></div><span className={styles.plannerSymbol}>✳</span><h2>Um dia.<br/><em>Uma página.</em><br/>Uma história.</h2><p>A cada capítulo, você chega um pouco mais perto do final.</p><div className={styles.plannerRuler}>✦ — ✦ — ✦ — ✦ — ✦</div></aside></div>
        </>}
        <footer className={styles.footer}><span>LIO · UM LUGAR PARA CHAMAR DE LIVRO.</span><span>CONCEITO DE DESIGN · NÃO É O SITE OFICIAL</span></footer>
      </main>
    </div>
  </div>;
}
