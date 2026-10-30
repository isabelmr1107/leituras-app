/** Proporções redesenhadas a partir do símbolo oficial enviado pelo usuário:
 * duas lombadas próximas (a segunda inclinada) e o anel rente à lombada menor.
 * Sem lettering extra, sem fundo, responsivo aos temas claro e escuro.
 */
export default function LioLogo({className="",title="LIO"}:{className?:string;title?:string}){
  return <svg className={"lio-logo "+className} viewBox="175 183 272 217" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="lio-silver" x1="0" y1="0" x2=".85" y2="1">
        <stop offset="0%" stopColor="currentColor" stopOpacity=".97"/>
        <stop offset="38%" stopColor="currentColor" stopOpacity=".79"/>
        <stop offset="72%" stopColor="currentColor" stopOpacity=".9"/>
        <stop offset="100%" stopColor="currentColor" stopOpacity=".73"/>
      </linearGradient>
      <linearGradient id="lio-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".35"/>
        <stop offset="40%" stopColor="#ffffff" stopOpacity=".04"/>
        <stop offset="100%" stopColor="#82dfe8" stopOpacity=".17"/>
      </linearGradient>
      <filter id="lio-grain" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence baseFrequency=".055" numOctaves="2" seed="8" type="fractalNoise" result="grain"/>
        <feColorMatrix in="grain" type="saturate" values="0" result="mono"/>
        <feComponentTransfer in="mono" result="fleck"><feFuncA type="linear" slope=".11"/></feComponentTransfer>
        <feBlend in="SourceGraphic" in2="fleck" mode="soft-light"/>
      </filter>
      <g id="lio-shapes">
        <rect x="190" y="198" width="44" height="184" rx=".65"/>
        <path d="M237 233L280.5 228L298.3 376.5L253 382Z"/>
        <path fillRule="evenodd" d="M365.8 254.7a63.7 63.7 0 1 0 0 127.4a63.7 63.7 0 1 0 0-127.4Zm0 31.4a32.3 32.3 0 1 1 0 64.6a32.3 32.3 0 0 1 0-64.6Z"/>
      </g>
      <clipPath id="lio-clip"><use href="#lio-shapes"/></clipPath>
    </defs>
    <use href="#lio-shapes" fill="url(#lio-silver)" filter="url(#lio-grain)"/>
    <use href="#lio-shapes" fill="url(#lio-sheen)"/>
    <g clipPath="url(#lio-clip)" fill="none" stroke="currentColor" opacity=".18">
      <path d="M191 199H233M191 381H233M238 234L281 229M254 381L297 376" strokeWidth="1.4"/>
    </g>
    <g stroke="var(--lio-logo-cut, #171723)" strokeWidth="2.8" strokeLinecap="square">
      <path d="M195.7 206.2h32.2M195.7 374.1h32.2"/>
      <path d="M243.3 241.1l32.3-3.8M244.1 247.8l32.4-3.9"/>
    </g>
  </svg>;
}