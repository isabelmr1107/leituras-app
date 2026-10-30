/** Logo LIO sem imagem de fundo: apenas as lombadas e o anel vetoriais.
 * O preenchimento semi-transparente deixa passar o gradiente do próprio site.
 * Sem filtros de ruído: a turbulência SVG anterior criava um quadrado visível.
 */
export default function LioLogo({className="",title="LIO"}:{className?:string;title?:string}){
  return <svg className={"lio-logo "+className} viewBox="175 183 272 217" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="lio-crystal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity=".59"/>
        <stop offset="28%" stopColor="currentColor" stopOpacity=".34"/>
        <stop offset="57%" stopColor="currentColor" stopOpacity=".52"/>
        <stop offset="100%" stopColor="currentColor" stopOpacity=".29"/>
      </linearGradient>
      <linearGradient id="lio-reflection" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff" stopOpacity=".25"/>
        <stop offset="38%" stopColor="#fff" stopOpacity="0"/>
        <stop offset="80%" stopColor="#9be6ee" stopOpacity=".11"/>
        <stop offset="100%" stopColor="#fff" stopOpacity=".13"/>
      </linearGradient>
      <g id="lio-shapes">
        <rect x="190" y="198" width="44" height="184" rx=".65"/>
        <path d="M237 233L280.5 228L298.3 376.5L253 382Z"/>
        <path fillRule="evenodd" d="M365.8 254.7a63.7 63.7 0 1 0 0 127.4a63.7 63.7 0 1 0 0-127.4Zm0 31.4a32.3 32.3 0 1 1 0 64.6a32.3 32.3 0 0 1 0-64.6Z"/>
      </g>
    </defs>
    <use href="#lio-shapes" fill="url(#lio-crystal)"/>
    <use href="#lio-shapes" fill="url(#lio-reflection)"/>
    <g fill="none" stroke="currentColor" strokeOpacity=".24" strokeWidth=".9">
      <rect x="190.5" y="198.5" width="43" height="183" rx=".5"/>
      <path d="M237.5 233.5L280 228.5L297.8 376L253.5 381.5Z"/>
      <circle cx="365.8" cy="318.4" r="63.2"/>
      <circle cx="365.8" cy="318.4" r="32.8"/>
    </g>
    <g stroke="var(--lio-logo-cut, currentColor)" strokeWidth="2.4" strokeLinecap="square" opacity=".78">
      <path d="M195.7 206.2h32.2M195.7 374.1h32.2"/>
      <path d="M243.3 241.1l32.3-3.8M244.1 247.8l32.4-3.9"/>
    </g>
  </svg>;
}