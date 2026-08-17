import{f as v,g as k,r as d,j as e}from"./vendor-niHG0XFr.js";import{b as N,u as w}from"./query-4CB0vgQa.js";import{m as S,g as z}from"./orders-CCoUxt7T.js";import{n as B,m as i,S as p,a as u,e as q,E as C,h as x,j as E,B as M,t as g}from"./index-C5r0Iz6m.js";import{u as P,a as Q}from"./tgHooks-BscFmKxn.js";import"./motion-BnQXSnrw.js";const T=[{id:"card",label:"картой",glyph:"💳"},{id:"sber",label:"sberpay",glyph:"🟢"},{id:"stars",label:"stars",glyph:"⭐️"}];function I(){const{id:m=""}=v(),n=k(),h=N(),o=B(s=>s.user),[r,y]=d.useState("idle"),[t,b]=d.useState("card"),l=w({queryKey:["order",m],queryFn:()=>z(m)}),a=l.data;P(r==="idle"?()=>n("/cart"):null);const j=d.useMemo(()=>([o?.firstName,o?.lastName].filter(Boolean).join(" ").trim()||"lunacy gamer").toUpperCase(),[o]),f=()=>{r!=="idle"||!a||(y("processing"),x.press(),g("payment_open",{orderId:a.id,method:t}),setTimeout(()=>{S(a.id),h.invalidateQueries({queryKey:["order",a.id]}),h.invalidateQueries({queryKey:["orders"]}),x.success(),y("done"),g("payment_success",{orderId:a.id,total:a.total}),setTimeout(()=>n(`/order/${a.id}`,{replace:!0}),1900)},2100))};return Q({text:a?r==="idle"?`оплатить · ${i(a.total)}`:"оплата…":"загрузка",visible:r==="idle",active:r==="idle",progress:r==="processing",onClick:f}),l.isLoading?e.jsxs(p,{children:[e.jsx(u,{title:"оплата"}),e.jsx(q,{className:"h-[210px] w-full rounded-2xl"})]}):l.isError||!a?e.jsx(p,{children:e.jsx(C,{message:"заказ не найден",onRetry:()=>n("/cart")})}):e.jsxs(p,{children:[e.jsx(u,{title:"оплата"}),e.jsxs("div",{className:"pay-card",children:[e.jsx("div",{className:"pay-card-sheen"}),e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsx("span",{className:"text-[15px] font-semibold lowercase tracking-[0.14em]",children:"lunacy"}),e.jsx("span",{className:"pay-wifi","aria-hidden":!0,children:"))"})]}),e.jsx("div",{className:"pay-chip","aria-hidden":!0}),e.jsxs("div",{className:"pay-number",children:[e.jsx("span",{children:"6767"}),e.jsx("span",{children:"••••"}),e.jsx("span",{children:"••••"}),e.jsx("span",{children:"2029"})]}),e.jsxs("div",{className:"flex items-end justify-between",children:[e.jsxs("div",{className:"min-w-0",children:[e.jsx("div",{className:"pay-label",children:"держатель"}),e.jsx("div",{className:"truncate text-[13px] tracking-wide",children:j})]}),e.jsxs("div",{className:"text-right",children:[e.jsx("div",{className:"pay-label",children:"до"}),e.jsx("div",{className:"text-[13px]",children:"12/29"})]}),e.jsx("div",{className:"pay-brand",children:"67"})]})]}),e.jsx("div",{className:"mt-5 grid grid-cols-3 gap-2",children:T.map(s=>e.jsxs("button",{onClick:()=>{x.select(),b(s.id)},className:"flex flex-col items-center gap-1 rounded-[6px] border px-2 py-3 text-[12px] transition",style:{borderColor:t===s.id?"var(--color-ink)":"var(--color-line)",background:t===s.id?"var(--color-surface)":"transparent",color:t===s.id?"var(--color-ink)":"var(--color-muted)"},children:[e.jsx("span",{className:"text-[18px] leading-none",children:s.glyph}),s.label]},s.id))}),e.jsxs("div",{className:"card mt-5 divide-y divide-[var(--color-line)]",children:[e.jsxs("div",{className:"flex items-center justify-between px-3.5 py-2.5 text-[13px]",children:[e.jsxs("span",{className:"text-[var(--color-muted)]",children:["заказ №",a.number]}),e.jsxs("span",{className:"text-[var(--color-soft)]",children:[a.items.length," поз."]})]}),e.jsxs("div",{className:"flex items-center justify-between px-3.5 py-3",children:[e.jsx("span",{className:"text-[13px] lowercase text-[var(--color-muted)]",children:"к оплате"}),e.jsx("span",{className:"tnum text-[22px] font-bold",children:i(a.total)})]})]}),!E&&e.jsx("div",{className:"mt-5",children:e.jsxs(M,{loading:r==="processing",onClick:f,children:["оплатить · ",i(a.total)]})}),e.jsx("p",{className:"mt-3 text-center text-[11px] text-[var(--color-muted)]",children:"демо-оплата · деньги не списываются"}),r!=="idle"&&e.jsx("div",{className:"pay-overlay",children:r==="processing"?e.jsxs("div",{className:"flex flex-col items-center gap-4",children:[e.jsx("span",{className:"pay-spinner"}),e.jsx("div",{className:"text-[15px] lowercase text-[var(--color-soft)]",children:"проверяем оплату…"})]}):e.jsxs("div",{className:"flex flex-col items-center gap-4",children:[e.jsx("span",{className:"pay-particles","aria-hidden":!0,children:Array.from({length:14}).map((s,c)=>e.jsx("b",{style:{"--i":String(c)},children:c%2?"7":"6"},c))}),e.jsxs("svg",{className:"pay-check",viewBox:"0 0 52 52",width:"86",height:"86",children:[e.jsx("circle",{cx:"26",cy:"26",r:"24",fill:"none",stroke:"#4ea86e",strokeWidth:"3",className:"pay-check-c"}),e.jsx("path",{fill:"none",stroke:"#4ea86e",strokeWidth:"5",strokeLinecap:"round",strokeLinejoin:"round",d:"M15 27l7 7 15-16",className:"pay-check-p"})]}),e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"text-[20px] font-semibold lowercase",children:"оплачено"}),e.jsxs("div",{className:"mt-1 text-[13px] text-[var(--color-muted)]",children:[i(a.total)," · заказ №",a.number]})]})]})}),e.jsx("style",{children:`
        .pay-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          padding: 18px;
          height: 210px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #f4f4f4;
          background:
            radial-gradient(120% 140% at 12% 8%, #2c3550 0%, transparent 55%),
            linear-gradient(150deg, #14161c 0%, #24202b 45%, #3a2b22 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 22px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12);
          animation: pay-card-in 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .pay-card-sheen {
          position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.14) 48%, transparent 62%);
          transform: translateX(-100%);
          animation: pay-sheen 3.6s ease-in-out 0.6s infinite;
        }
        .pay-wifi { font-size: 15px; opacity: 0.7; transform: rotate(90deg); letter-spacing: -2px; }
        .pay-chip {
          width: 42px; height: 32px; border-radius: 6px;
          background: linear-gradient(135deg, #e6c15a, #b8923a);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15), inset 0 -3px 6px rgba(0,0,0,0.25);
        }
        .pay-chip::after {
          content:''; display:block; margin: 9px auto 0; width: 60%; height: 12px; border-radius: 2px;
          background:
            linear-gradient(90deg, transparent 48%, rgba(0,0,0,0.25) 49%, transparent 51%),
            linear-gradient(0deg, transparent 48%, rgba(0,0,0,0.25) 49%, transparent 51%);
        }
        .pay-number {
          display: flex; gap: 14px; font-size: 18px; letter-spacing: 2px;
          font-weight: 600; text-shadow: 0 1px 1px rgba(0,0,0,0.4);
        }
        .pay-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.5); }
        .pay-brand {
          font-size: 22px; font-weight: 800; letter-spacing: -0.04em;
          color: rgba(255,255,255,0.85);
        }
        .pay-overlay {
          position: fixed; inset: 0; z-index: 60;
          display: grid; place-items: center;
          background: rgba(14,14,14,0.86); backdrop-filter: blur(6px);
          animation: pay-fade 0.25s ease;
        }
        .pay-spinner {
          width: 44px; height: 44px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.18); border-top-color: #f4f4f4;
          animation: pay-spin 0.8s linear infinite;
        }
        .pay-check-c { stroke-dasharray: 151; stroke-dashoffset: 151; animation: pay-draw 0.5s ease forwards; }
        .pay-check-p { stroke-dasharray: 48; stroke-dashoffset: 48; animation: pay-draw 0.4s ease 0.35s forwards; }
        .pay-check { animation: pay-pop 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .pay-particles { position: absolute; width: 0; height: 0; }
        .pay-particles b {
          position: absolute; font-weight: 800; font-size: 15px; color: #f4f4f4;
          left: 0; top: 0;
          transform: rotate(calc(var(--i) * 26deg)) translateY(0);
          animation: pay-burst 1.1s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        @keyframes pay-card-in { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes pay-sheen { 0% { transform: translateX(-100%);} 55%,100% { transform: translateX(100%);} }
        @keyframes pay-spin { to { transform: rotate(360deg);} }
        @keyframes pay-fade { from { opacity: 0;} to { opacity: 1;} }
        @keyframes pay-pop { from { transform: scale(0.5); opacity: 0;} to { transform: scale(1); opacity: 1;} }
        @keyframes pay-draw { to { stroke-dashoffset: 0; } }
        @keyframes pay-burst {
          from { opacity: 1; transform: rotate(calc(var(--i) * 26deg)) translateY(-8px) scale(0.6); }
          to { opacity: 0; transform: rotate(calc(var(--i) * 26deg)) translateY(-120px) scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pay-card-sheen, .pay-particles b { animation: none; }
        }
      `})]})}export{I as default};
