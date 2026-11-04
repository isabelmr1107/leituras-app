"use client";
import LioLogo from "./lio-logo";
export default function LioIntroArt({kind}:{kind:"welcome"|"shelf"|"journal"|"ready"}){
 if(kind==="welcome")return <svg className="lio-ref-open-book" viewBox="0 0 310 220" aria-hidden="true">
  <defs><linearGradient id="lio-book-left" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe1f0"/><stop offset=".6" stopColor="#f29cc8"/><stop offset="1" stopColor="#dc78b1"/></linearGradient>
  <linearGradient id="lio-book-right" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#faf4ff"/><stop offset="1" stopColor="#9a83e4"/></linearGradient></defs>
  <ellipse cx="155" cy="190" rx="111" ry="15" fill="#a88cd3" opacity=".17"/>
  <path d="M155 166 Q105 142 42 166 L40 181 Q103 168 155 191 Q208 168 270 181 L268 165 Q203 142 155 166Z" fill="#a17bd5"/>
  <path d="M155 164 Q104 126 53 149 Q44 164 42 173 Q101 153 155 184Z" fill="url(#lio-book-left)" stroke="#f8e7fb" strokeWidth="3"/>
  <path d="M155 164 Q207 126 257 149 Q264 164 268 173 Q208 153 155 184Z" fill="url(#lio-book-right)" stroke="#f8e7fb" strokeWidth="3"/>
  <path d="M155 165 Q104 119 54 140 L51 154 Q100 132 155 175Z" fill="#fff5fb" opacity=".95"/>
  <path d="M155 165 Q207 119 257 140 L261 154 Q210 132 155 175Z" fill="#fff8ff" opacity=".94"/>
  <path d="M155 165 Q102 110 61 128 L56 141 Q109 126 155 169Z" fill="#fff8ff" stroke="#eddcfb" strokeWidth="2"/>
  <path d="M155 165 Q207 110 249 128 L254 141 Q206 126 155 169Z" fill="#fff" stroke="#ede5fc" strokeWidth="2"/>
  <g stroke="#e4cceb" strokeWidth="2" strokeLinecap="round" opacity=".9"><path d="M67 139Q100 135 136 155M72 148Q106 143 136 163M243 139Q208 135 173 155M240 148Q203 143 173 163"/></g>
  <g stroke="#e978b6" strokeWidth="4" strokeLinecap="round"><path d="M155 25v13M133 31l-8-10M176 31l8-10"/></g>
 </svg>;
 if(kind==="shelf")return <div className="lio-ref-books" aria-hidden="true"><i/><i/><i/><span>✦</span><b>✧</b></div>;
 if(kind==="journal")return <div className="lio-ref-cards" aria-hidden="true">
  <div className="lio-ref-card lio-ref-card-one"><span>▦</span><i/><i/><b>✓</b></div>
  <div className="lio-ref-card lio-ref-card-two"><span>📖</span><small>Minha meta</small><strong>37 de 50 livros</strong><i/></div>
  <div className="lio-ref-card lio-ref-card-three"><span>▥</span><i/><i/><i/></div>
 </div>;
 return <div className="lio-ref-ready" aria-hidden="true"><LioLogo/><span>✦</span></div>;
}
