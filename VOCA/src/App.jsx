import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { pushToCloud, pullFromCloud, suggestSyncCode } from "./lib/sync.js";
import {
  Bell, Settings, Flame, Sparkles, RotateCcw, XCircle, Home as HomeIcon,
  BookOpen, GraduationCap, Camera, BarChart3, Search, ChevronRight, ChevronDown,
  Check, X, Loader2, Image as ImageIcon, FileText, ClipboardPaste, Mic, Wand2, PartyPopper,
  Volume2, Lightbulb, Sprout, Music2, Lock, Award, UploadCloud, Trash2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from "recharts";

/* ---------------------------------------------------------------
   TOKENS — "spiral notebook + highlighter" visual system
----------------------------------------------------------------*/
const C = {
  paper: "#EAEEF0",
  paperLine: "#DBE1E4",
  marginStrip: "#E1E6E8",
  marginRule: "#D8503E",
  ink: "#212A3A",
  inkSoft: "#66707E",
  inkFaint: "#98A1AC",
  card: "#FFFFFF",
  yellow: "#FFCF3F",   // new words
  mint: "#3FC894",     // mastered / review
  pink: "#FF6F94",     // streak / wrong review
  blue: "#5B9BD8",     // analysis
  purple: "#B08CE8",   // import
  danger: "#E0503E",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Noto+Sans+KR:wght@400;500;700;900&family=Space+Grotesk:wght@500;600;700&display=swap');`;

// Daily cap on brand-new words surfaced on Home/session, regardless of how large the word bank is.
const DAILY_NEW_CAP = 20;

// Your own serverless proxy that holds the real Anthropic API key server-side
// and forwards the request. See /api/claude.js in this project for a Vercel
// example. NEVER put an Anthropic API key in this frontend code.
const CLAUDE_API_ENDPOINT = "/api/claude";

/* ---------------------------------------------------------------
   DATE HELPERS
----------------------------------------------------------------*/
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const diffDays = (fromISO, toISO) => {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
};
const weekdayKR = (iso) => ["일", "월", "화", "수", "목", "금", "토"][new Date(iso + "T00:00:00").getDay()];

/* ---------------------------------------------------------------
   SEED VOCABULARY (수능 필수 어휘 24개)
----------------------------------------------------------------*/
const RAW_WORDS = [
  { en: "affect", pos: "v.", ko: "영향을 미치다", ipa: "/əˈfekt/", emoji: "🌊",
    example: "Climate change can affect crop yields significantly.",
    examSentence: "Prolonged stress can affect both physical and mental health.",
    mnemonic: "\"어, FACT(팩트)잖아!\" 싶을 만큼 확실하게 영향을 미쳤다",
    etymology: "ad-(~쪽으로) + fect(=facere, 하다) → 무언가에 작용을 가하다",
    song: "어펙트 어펙트~ 영향을 미쳐요 / 팩트처럼 콕! 박히게~" },
  { en: "accept", pos: "v.", ko: "받아들이다", ipa: "/əkˈsept/", emoji: "🤝",
    example: "She found it hard to accept the criticism.",
    examSentence: "Scientists were initially reluctant to accept the new theory.",
    mnemonic: "\"액수 그대로 SET(셋)!\" 억지로라도 정해준 대로 받아들이다",
    etymology: "ac-(~로) + cept(잡다) → 손으로 잡아 받아들이다",
    song: "액셉트 액셉트~ 받아들여요 / 손 내밀어 잡아봐요~" },
  { en: "approach", pos: "v./n.", ko: "접근하다; 접근법", ipa: "/əˈproʊtʃ/", emoji: "🚶‍♀️",
    example: "We need a new approach to this problem.",
    examSentence: "Researchers adopted a completely different approach to solve the puzzle.",
    mnemonic: "물에서 \"어푸어푸\" 허우적대며(approach) 목표 쪽으로 다가가다",
    etymology: "ap-(~로) + proach(가깝다) → 가까이 다가가다",
    song: "어프로치 어프로치~ 다가가요 / 한 걸음씩 접근해요~" },
  { en: "consequence", pos: "n.", ko: "결과", ipa: "/ˈkɑːnsəkwens/", emoji: "🔗",
    example: "Every choice has a consequence.",
    examSentence: "Overusing natural resources may lead to serious consequences for future generations.",
    mnemonic: "과자 콘(cone)을 시퀀스(순서)대로 쌓다가 와르르 — 그게 바로 결과",
    etymology: "con-(함께) + sequ(따라가다) → 원인을 뒤따라오는 것",
    song: "컨시퀀스 컨시퀀스~ 결과가 와요 / 선택 뒤엔 늘 따라와요~" },
  { en: "evidence", pos: "n.", ko: "증거", ipa: "/ˈevɪdəns/", emoji: "🔍",
    example: "There is no evidence to support the claim.",
    examSentence: "The study provides compelling evidence that sleep affects memory formation.",
    mnemonic: "\"에비!(하지 마)\" 소리가 절로 날 만큼 빼도 박도 못할 증거",
    etymology: "e-(밖으로) + vid(보다) → 밖으로 드러나 보이는 것",
    song: "에비던스 에비던스~ 증거 있어요 / 눈으로 확인해봐요~" },
  { en: "phenomenon", pos: "n.", ko: "현상", ipa: "/fəˈnɑːmɪnən/", emoji: "🌈",
    example: "Global warming is a well-documented phenomenon.",
    examSentence: "Urban heat islands are a phenomenon caused by dense construction.",
    mnemonic: "\"피 노(no) 미(mystery) 논(non)\" — 도저히 설명 안 되는 신비한 현상",
    etymology: "그리스어 phainein(보이다) → 눈앞에 나타나 보이는 것",
    song: "피노메논 피노메논~ 신기한 현상 / 두 눈으로 목격해요~" },
  { en: "sustain", pos: "v.", ko: "지속하다", ipa: "/səˈsteɪn/", emoji: "🏋️",
    example: "The economy struggled to sustain growth.",
    examSentence: "It is difficult to sustain motivation without a clear long-term goal.",
    mnemonic: "\"서서, stay인(있는) 채로\" 자세를 무너뜨리지 않고 계속 지속하다",
    etymology: "sus-(아래에서) + tain(잡다) → 밑에서 받쳐 지속시키다",
    song: "서스테인 서스테인~ 계속 지속해요 / 끝까지 붙잡아요~" },
  { en: "inevitable", pos: "adj.", ko: "불가피한", ipa: "/ɪnˈevɪtəbl/", emoji: "⏳",
    example: "Change is inevitable in a growing company.",
    examSentence: "As technology advances, some job losses seem inevitable.",
    mnemonic: "\"이거 너 비틀거려도 (un)able?\" 안돼, 피할 수 없어 — 불가피한 일",
    etymology: "in-(부정) + evitabilis(피할 수 있는) → 피할 수 없는",
    song: "인에비터블 인에비터블~ 피할 수 없어요 / 운명처럼 다가와요~" },
  { en: "ambiguous", pos: "adj.", ko: "애매한", ipa: "/æmˈbɪɡjuəs/", emoji: "🌫️",
    example: "His answer was deliberately ambiguous.",
    examSentence: "The instructions were so ambiguous that no one knew where to start.",
    mnemonic: "\"엄(마)비교 어서!\" 해도 못할 만큼, 뭐가 뭔지 애매한 상황",
    etymology: "ambi-(양쪽) + ig(=agere, 몰다) → 양쪽으로 갈 수 있는",
    song: "앰비규어스 앰비규어스~ 애매모호해요 / 이도저도 아니에요~" },
  { en: "coherent", pos: "adj.", ko: "일관된", ipa: "/koʊˈhɪrənt/", emoji: "🧩",
    example: "She gave a coherent explanation of the event.",
    examSentence: "A coherent argument requires each point to logically support the next.",
    mnemonic: "\"코 히어(here) 런트(run되어)\" — 여기저기 안 새고 딱 이어지는 논리",
    etymology: "co-(함께) + here(붙다) → 서로 붙어 있는",
    song: "코히어런트 코히어런트~ 앞뒤가 맞아요 / 착착 이어져요~" },
  { en: "derive", pos: "v.", ko: "유래하다, 이끌어내다", ipa: "/dɪˈraɪv/", emoji: "🌱",
    example: "The word is derived from Latin.",
    examSentence: "Many English words derive from Latin and Greek roots.",
    mnemonic: "\"디(the) 리버(river, 강)\"에서 물줄기가 흘러나오듯 어딘가에서 유래하다",
    etymology: "de-(아래로) + rivus(개울) → 개울처럼 흘러나오다",
    song: "디라이브 디라이브~ 유래되었어요 / 뿌리에서 나왔어요~" },
  { en: "illustrate", pos: "v.", ko: "설명하다, 보여주다", ipa: "/ˈɪləstreɪt/", emoji: "🖼️",
    example: "This graph illustrates the trend clearly.",
    examSentence: "The chart illustrates how energy consumption has changed over the decade.",
    mnemonic: "\"일러(일찍) 스트레이트(straight)로\" 그림 그려가며 곧장 보여주다",
    etymology: "il-(안에) + lustr(빛나다) → 빛을 비춰 보여주다",
    song: "일러스트레이트 일러스트레이트~ 보여줄게요 / 그림처럼 설명해요~" },
  { en: "contradict", pos: "v.", ko: "모순되다", ipa: "/ˌkɑːntrəˈdɪkt/", emoji: "⚡",
    example: "His statement seems to contradict the earlier report.",
    examSentence: "The witness's testimony seemed to contradict the earlier police report.",
    mnemonic: "고깔(콘) 모양 트로피를 \"이거 내 딕(dic, 말)이야\"라며 서로 우겨 모순되다",
    etymology: "contra-(반대로) + dict(말하다) → 반대로 말하다",
    song: "컨트라딕트 컨트라딕트~ 모순돼요 / 앞뒤가 안 맞아요~" },
  { en: "undermine", pos: "v.", ko: "약화시키다", ipa: "/ˌʌndərˈmaɪn/", emoji: "⛏️",
    example: "Constant criticism can undermine confidence.",
    examSentence: "Frequent interruptions can undermine a team's productivity.",
    mnemonic: "\"언더(아래) 마인(내 것)\"이 무너져 내리듯 자신감이 약화되다",
    etymology: "under-(아래) + mine(파다) → 아래를 파서 약화시키다",
    song: "언더마인 언더마인~ 약화시켜요 / 밑에서부터 흔들어요~" },
  { en: "plausible", pos: "adj.", ko: "그럴듯한", ipa: "/ˈplɔːzəbl/", emoji: "🤔",
    example: "It's a plausible explanation, but unproven.",
    examSentence: "Although the theory sounds plausible, it still lacks solid proof.",
    mnemonic: "\"플러스(plus) 어블(able)\" — 살 붙일수록 점점 그럴듯해지는 변명",
    etymology: "plaudere(박수치다) → 박수받을 만한",
    song: "플로저블 플로저블~ 그럴듯해요 / 믿을 만해 보여요~" },
  { en: "arbitrary", pos: "adj.", ko: "임의적인", ipa: "/ˈɑːrbɪtreri/", emoji: "🎲",
    example: "The decision seemed completely arbitrary.",
    examSentence: "Critics argued that the punishment was arbitrary and unfair.",
    mnemonic: "\"알바(아르바이트) 트레리(그대로)\" — 알바생 기분대로 정한 임의적인 규칙",
    etymology: "arbiter(중재자, 심판) → 심판 마음대로인",
    song: "아비트러리 아비트러리~ 맘대로예요 / 기준이 따로 없어요~" },
  { en: "distinct", pos: "adj.", ko: "뚜렷한, 별개의", ipa: "/dɪˈstɪŋkt/", emoji: "✂️",
    example: "The two species are genetically distinct.",
    examSentence: "The two dialects, though related, remain distinct in pronunciation.",
    mnemonic: "\"디(die, 색깔) 스팅(sting, 콕 찌르듯)\" 선명하게 구분되는 색",
    etymology: "di-(분리) + stinct(=stinguere, 찌르다) → 따로 구분 짓다",
    song: "디스팅트 디스팅트~ 뚜렷해요 / 딱 구분이 돼요~" },
  { en: "differentiate", pos: "v.", ko: "구별하다", ipa: "/ˌdɪfəˈrenʃieɪt/", emoji: "🔀",
    example: "It's hard to differentiate the twins.",
    examSentence: "It is important to differentiate between correlation and causation.",
    mnemonic: "\"디퍼(different) 런(run) 시에이트\" 서로 다른 길로 달려가 구별되다",
    etymology: "differre(다르게 나르다) → 다르게 만들다",
    song: "디퍼런시에이트 디퍼런시에이트~ 구별해요 / 다른 걸 찾아봐요~" },
  { en: "comprehend", pos: "v.", ko: "이해하다", ipa: "/ˌkɑːmprɪˈhend/", emoji: "💡",
    example: "Young children may not comprehend the risk.",
    examSentence: "Some abstract concepts are hard for young children to comprehend.",
    mnemonic: "\"컴(come) 프리(free) 헨드(hand)\" 손이 자유로워질 만큼 완전히 이해되다",
    etymology: "com-(완전히) + prehend(잡다) → 완전히 붙잡아 이해하다",
    song: "컴프리헨드 컴프리헨드~ 이해해요 / 완전히 알겠어요~" },
  { en: "prevalent", pos: "adj.", ko: "널리 퍼진", ipa: "/ˈprevələnt/", emoji: "🌐",
    example: "The disease is more prevalent in urban areas.",
    examSentence: "Social media use has become increasingly prevalent among teenagers.",
    mnemonic: "\"프리(free) 벌(bug떼) 런트\" 벌레 떼가 자유롭게 사방으로 퍼지는 장면",
    etymology: "prae-(미리) + valere(힘 있다) → 미리 힘을 얻어 퍼짐",
    song: "프레벌런트 프레벌런트~ 널리 퍼져요 / 여기저기 다 있어요~" },
  { en: "subsequent", pos: "adj.", ko: "그 다음의", ipa: "/ˈsʌbsɪkwənt/", emoji: "➡️",
    example: "The results were confirmed in subsequent tests.",
    examSentence: "The initial results were confirmed by several subsequent experiments.",
    mnemonic: "\"섭(서브) 시퀀트\" 지하철 서브웨이처럼 다음 칸으로 바로 이어지다",
    etymology: "sub-(아래) + sequ(따르다) → 뒤이어 따라오는",
    song: "서브시퀀트 서브시퀀트~ 그다음이에요 / 뒤이어 따라와요~" },
  { en: "mitigate", pos: "v.", ko: "완화하다", ipa: "/ˈmɪtɪɡeɪt/", emoji: "🩹",
    example: "New policies aim to mitigate the damage.",
    examSentence: "Local governments introduced measures to mitigate flood damage.",
    mnemonic: "\"미(米,쌀)티(차) 게이트(문)\" 앞에서 따뜻한 차 한 잔으로 화를 완화하다",
    etymology: "mitis(부드러운) + agere(만들다) → 부드럽게 만들다",
    song: "미티게이트 미티게이트~ 완화해요 / 살살 부드럽게요~" },
  { en: "invoke", pos: "v.", ko: "불러일으키다, 언급하다", ipa: "/ɪnˈvoʊk/", emoji: "📣",
    example: "The speech invoked a sense of unity.",
    examSentence: "The author invokes a famous historical event to support her argument.",
    mnemonic: "\"인(안) 보크(불러)\" 확성기 없이 마음 안쪽으로 감정을 불러일으키다",
    etymology: "in-(안으로) + voke(=vocare, 부르다) → 안으로 불러들이다",
    song: "인보크 인보크~ 불러일으켜요 / 마음속에 소환해요~" },
  { en: "reluctant", pos: "adj.", ko: "꺼리는", ipa: "/rɪˈlʌktənt/", emoji: "🙅",
    example: "He was reluctant to admit his mistake.",
    examSentence: "Employees were reluctant to voice their concerns during the meeting.",
    mnemonic: "\"릴렉(relax) 턴트(안 turn함)\" — 편하게 있고 싶어 몸을 안 돌리며 꺼리다",
    etymology: "re-(반대로) + luct(=luctari, 싸우다) → 반대로 애쓰며 꺼리다",
    song: "릴럭턴트 릴럭턴트~ 꺼려져요 / 마음이 망설여져요~" },
];

function seedWords() {
  const t = todayISO();
  return RAW_WORDS.map((w, i) => {
    const base = { id: `w${i + 1}`, ...w, source: "수능필수" };
    if (i < 10) return { ...base, reps: 0, interval: 0, ease: 2.5, dueDate: t, wrongCount: 0, lastReviewed: null };
    if (i < 18) return { ...base, reps: 2, interval: 3, ease: 2.3, dueDate: t, wrongCount: 0, lastReviewed: addDays(t, -3) };
    return { ...base, reps: 1, interval: 1, ease: 1.8, dueDate: t, wrongCount: (i % 4) + 1, lastReviewed: addDays(t, -1) };
  });
}

/* ---------------------------------------------------------------
   SPEECH — pronunciation & chant playback (Web Speech API, on-device)
----------------------------------------------------------------*/
function getVoicesAsync() {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve([]); return; }
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length > 0) { resolve(existing); return; }
    let settled = false;
    const onChange = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    // fallback in case the event never fires on some browsers
    setTimeout(() => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    }, 700);
  });
}

async function speakText(text, langPrefix, opts = {}) {
  try {
    if (!window.speechSynthesis) return false;
    const voices = await getVoicesAsync();
    const match = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
    if (langPrefix === "ko" && !match) return false; // no Korean voice on this device — surface it instead of failing silently
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = match ? match.lang : (langPrefix === "ko" ? "ko-KR" : "en-US");
    if (match) u.voice = match;
    u.rate = opts.rate || 1;
    if (opts.pitch) u.pitch = opts.pitch;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

function speakEN(text) {
  speakText(text, "en", { rate: 0.85 });
}
function speakChant(text) {
  return speakText(text, "ko", { rate: 0.95, pitch: 1.3 });
}

/* ---------------------------------------------------------------
   SM-2 inspired grading
----------------------------------------------------------------*/
function gradeWord(word, quality) {
  // quality: 0=몰라요 1=애매해요 2=알아요 3=쉬워요
  const w = { ...word };
  const t = todayISO();
  w.lastReviewed = t;
  if (quality === 0) {
    w.reps = 0;
    w.interval = 0;
    w.ease = Math.max(1.3, w.ease - 0.2);
    w.wrongCount = w.wrongCount + 1;
    w.dueDate = t;
  } else {
    w.reps = w.reps + 1;
    if (w.reps === 1) w.interval = 1;
    else if (w.reps === 2) w.interval = 3;
    else w.interval = Math.round(w.interval * w.ease);
    if (quality === 1) {
      w.ease = Math.max(1.3, w.ease - 0.15);
      w.interval = Math.max(1, Math.round(w.interval * 0.8));
    }
    if (quality === 3) w.ease = w.ease + 0.15;
    if (quality >= 2) w.wrongCount = Math.max(0, w.wrongCount - 1);
    w.dueDate = addDays(t, w.interval);
  }
  return w;
}

/* ---------------------------------------------------------------
   BADGES — achievement system for daily-open motivation
----------------------------------------------------------------*/
const BADGES = [
  { id: "first", label: "첫 학습 완료", desc: "학습을 처음 마쳤어요", icon: Sparkles, color: C.yellow },
  { id: "streak3", label: "3일 연속", desc: "3일 연속으로 학습했어요", icon: Flame, color: C.pink },
  { id: "streak7", label: "일주일 연속", desc: "7일 연속으로 학습했어요", icon: Flame, color: C.pink },
  { id: "streak30", label: "한 달 연속", desc: "30일 연속으로 학습했어요", icon: Award, color: C.pink },
  { id: "mastered10", label: "암기왕 10", desc: "10개 단어를 완전히 암기했어요", icon: GraduationCap, color: C.mint },
  { id: "noWrong", label: "오답 완전정복", desc: "오답 단어를 모두 극복했어요", icon: Check, color: C.blue },
];

function evaluateBadges({ streak, sessionsCount, masteredCount, everReviewedCount, wrongReviewCount }) {
  const earned = [];
  if (sessionsCount >= 1) earned.push("first");
  if (streak >= 3) earned.push("streak3");
  if (streak >= 7) earned.push("streak7");
  if (streak >= 30) earned.push("streak30");
  if (masteredCount >= 10) earned.push("mastered10");
  if (everReviewedCount > 0 && wrongReviewCount === 0) earned.push("noWrong");
  return earned;
}


function HL({ children, color = C.yellow, style }) {
  return (
    <span
      style={{
        background: color,
        opacity: 0.85,
        mixBlendMode: "multiply",
        borderRadius: "40% 60% 58% 42% / 52% 40% 60% 48%",
        padding: "1px 8px",
        display: "inline-block",
        transform: "rotate(-1deg)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function HLBar({ percent, color = C.mint }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ position: "relative", height: 14, background: "#DEE3E5", borderRadius: 8, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: -2, top: -3, bottom: -3, width: `calc(${p}% + 4px)`,
          background: color, opacity: 0.6, mixBlendMode: "multiply",
          borderRadius: "40% 60% 60% 40% / 50% 40% 60% 50%",
          transition: "width .5s ease",
        }}
      />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, boxShadow: "0 1px 2px rgba(33,42,58,0.06), 0 1px 8px rgba(33,42,58,0.05)", ...style }}>
      {children}
    </div>
  );
}

function Chip({ children, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none", cursor: "pointer", whiteSpace: "nowrap",
        padding: "6px 12px", borderRadius: 999, fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: 12, fontWeight: 700,
        background: active ? color : "#fff",
        color: active ? "#fff" : C.inkSoft,
        boxShadow: active ? "none" : "inset 0 0 0 1px #DBE1E4",
      }}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------
   LEARN TOOLS — 연상암기 · 어원 · 예문 · 암기챈트 (optional deep-dive per word)
----------------------------------------------------------------*/
function LearnTools({ word, compact, onGenerate }) {
  const [open, setOpen] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const [chantMsg, setChantMsg] = useState(null);
  const tools = [
    { id: "mnemonic", label: "연상", icon: Lightbulb, color: C.yellow, content: word.mnemonic, sub: "소리 연상 (경선식 스타일) · 발음이 비슷한 한국어로 장면을 연결해요" },
    { id: "etymology", label: "어원", icon: Sprout, color: C.mint, content: word.etymology, sub: "어근 분해 · 접두사·어근의 원래 의미로 이해해요" },
    { id: "exam", label: "예문", icon: FileText, color: C.blue, content: word.examSentence },
    { id: "song", label: "암기챈트", icon: Music2, color: C.pink, content: word.song },
  ].filter((t) => t.content);

  if (tools.length === 0) {
    if (!onGenerate) return null;
    const handleClick = async (e) => {
      e.stopPropagation();
      setGenerating(true);
      setGenError(false);
      const ok = await onGenerate(word.id);
      setGenerating(false);
      if (!ok) setGenError(true);
    };
    return (
      <div style={{ marginTop: compact ? 8 : 14 }}>
        <button
          onClick={handleClick}
          disabled={generating}
          style={{
            display: "flex", alignItems: "center", gap: 6, border: "none", cursor: generating ? "default" : "pointer",
            padding: compact ? "7px 12px" : "8px 14px", borderRadius: 999, background: C.ink, color: "#fff",
            fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: compact ? 11.5 : 12.5,
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {generating ? "만드는 중..." : "AI로 학습 도구 만들기"}
        </button>
        {genError && (
          <div style={{ marginTop: 6, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.danger }}>
            생성에 실패했어요. 다시 시도해주세요.
          </div>
        )}
      </div>
    );
  }
  const activeTool = tools.find((t) => t.id === open);

  return (
    <div style={{ marginTop: compact ? 8 : 14, textAlign: "left" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tools.map((tItem) => {
          const Icon = tItem.icon;
          const active = open === tItem.id;
          return (
            <button
              key={tItem.id}
              onClick={(e) => { e.stopPropagation(); setOpen(active ? null : tItem.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer",
                padding: compact ? "5px 9px" : "6px 11px", borderRadius: 999,
                background: active ? tItem.color : "#fff",
                boxShadow: active ? "none" : `inset 0 0 0 1px ${C.paperLine}`,
                fontFamily: "'Noto Sans KR', sans-serif", fontSize: compact ? 11 : 12, fontWeight: 700,
                color: active ? "#fff" : C.inkSoft,
              }}
            >
              <Icon size={compact ? 12 : 13} />
              {tItem.label}
            </button>
          );
        })}
      </div>
      {activeTool && (
        <div style={{
          marginTop: 8, padding: compact ? 10 : 12, borderRadius: 12, background: C.paper,
          fontFamily: "'Noto Sans KR', sans-serif", fontSize: compact ? 12 : 13, color: C.ink, lineHeight: 1.55,
        }}>
          {activeTool.sub && (
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.inkFaint, marginBottom: 5 }}>{activeTool.sub}</div>
          )}
          {activeTool.content}
          {activeTool.id === "song" && (
            <>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setChantMsg(null);
                  const ok = await speakChant(word.song);
                  if (!ok) setChantMsg("이 기기에는 한국어 음성이 없어서 소리로 재생할 수 없어요. 가사를 눈으로 리듬 맞춰 읽어보세요!");
                }}
                style={{
                  marginTop: 9, display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
                  background: C.pink, color: "#fff", borderRadius: 999, padding: "6px 12px",
                  fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 12,
                }}
              >
                <Volume2 size={13} /> 리듬으로 들어보기
              </button>
              {chantMsg && (
                <div style={{ marginTop: 7, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, lineHeight: 1.5 }}>
                  {chantMsg}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   HEADER
----------------------------------------------------------------*/
function Header({ onSettings, alertCount }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: C.paper, paddingTop: 14, paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 22, color: C.ink, lineHeight: 1 }}>
            수능 영단어장
          </div>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, marginTop: 3 }}>
            고1 · 데일리 학습
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Bell size={19} color={C.inkSoft} strokeWidth={2} />
            {alertCount > 0 && (
              <span style={{
                position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: 999,
                background: C.pink, boxShadow: "0 0 0 2px " + C.paper,
              }} />
            )}
          </div>
          <button onClick={onSettings} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <Settings size={19} color={C.inkSoft} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   HOME SCREEN
----------------------------------------------------------------*/
function HomeScreen({ buckets, meta, ddayLeft, todayProgress, weakWords, onStart }) {
  const totalDue = buckets.newWords.length + buckets.dueReview.length + buckets.wrongReview.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      {/* D-day + streak */}
      <div style={{ display: "flex", gap: 10 }}>
        <Card style={{ flex: 1, padding: "14px 16px" }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, fontWeight: 700 }}>수능 D-day</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: C.danger, marginTop: 2 }}>
            D-{ddayLeft}
          </div>
        </Card>
        <Card style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={15} color={C.pink} fill={C.pink} />
            <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, fontWeight: 700 }}>연속 학습</span>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: C.ink, marginTop: 2 }}>
            {meta.streak}일
          </div>
        </Card>
      </div>

      {/* section title */}
      <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 19, color: C.ink }}>
        <HL color={C.yellow}>오늘의 학습</HL>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <StatRow icon={<Sparkles size={18} color={C.yellow} />} label="신규 암기" count={buckets.newWords.length} accent={C.yellow} />
        {buckets.newWordsAll.length > buckets.newWords.length && (
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, marginTop: -4, marginLeft: 4 }}>
            전체 미학습 단어 {buckets.newWordsAll.length}개 중 오늘 {buckets.newWords.length}개
          </div>
        )}
        <StatRow icon={<RotateCcw size={18} color={C.mint} />} label="복습 예정" count={buckets.dueReview.length} accent={C.mint} />
        <StatRow icon={<XCircle size={18} color={C.pink} />} label="오답 복습" count={buckets.wrongReview.length} accent={C.pink} />
      </div>

      {/* progress */}
      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, fontWeight: 700, color: C.inkSoft }}>오늘 학습률</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: C.ink }}>{todayProgress}%</span>
        </div>
        <HLBar percent={todayProgress} color={C.mint} />
      </Card>

      {/* weakness */}
      {weakWords.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 18, color: C.ink, marginBottom: 8 }}>
            ⭐ 오늘 집중할 단어
          </div>
          <Card style={{ padding: "4px 4px" }}>
            {weakWords.map((w, i) => (
              <div key={w.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderBottom: i < weakWords.length - 1 ? `1px solid ${C.paperLine}` : "none",
              }}>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: C.inkFaint, width: 16,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>{w.en}</div>
                  <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint }}>{w.ko}</div>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, color: C.pink,
                  background: "#FFEAF0", padding: "3px 8px", borderRadius: 999,
                }}>
                  {w.wrongCount}번 틀림
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* CTA */}
      {totalDue > 0 ? (
        <button
          onClick={onStart}
          style={{
            marginTop: 4, border: "none", cursor: "pointer", borderRadius: 14, padding: "15px 0",
            background: C.ink, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          학습 시작하기 <ChevronRight size={17} />
        </button>
      ) : (
        <Card style={{ padding: "20px 16px", textAlign: "center" }}>
          <PartyPopper size={22} color={C.mint} style={{ marginBottom: 6 }} />
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>
            오늘 학습을 모두 마쳤어요!
          </div>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkFaint, marginTop: 3 }}>
            내일 또 만나요 🌙
          </div>
        </Card>
      )}
    </div>
  );
}

function StatRow({ icon, label, count, accent }) {
  return (
    <Card style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, borderLeft: `4px solid ${accent}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, fontWeight: 700, color: C.ink }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.ink }}>{count}<span style={{ fontSize: 12, color: C.inkFaint, fontFamily: "'Noto Sans KR', sans-serif", marginLeft: 2 }}>개</span></div>
    </Card>
  );
}

/* ---------------------------------------------------------------
   LEARN SCREEN
----------------------------------------------------------------*/
function LearnScreen({ queue, onGrade, onExit, onGenerateTools }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState({ studied: 0, correct: 0 });
  const [done, setDone] = useState(false);

  const current = queue[index];

  const handleGrade = (quality) => {
    onGrade(current.id, quality);
    setResults((r) => ({ studied: r.studied + 1, correct: r.correct + (quality >= 2 ? 1 : 0) }));
    setFlipped(false);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (queue.length === 0) return null;

  if (done) {
    const acc = results.studied ? Math.round((results.correct / results.studied) * 100) : 0;
    return (
      <div style={{ position: "fixed", inset: 0, background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 50, padding: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: C.mint + "33", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={30} color={C.mint} strokeWidth={3} />
        </div>
        <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 24, color: C.ink }}>오늘 학습 완료!</div>
        <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: C.ink }}>{results.studied}</div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint }}>학습한 단어</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: C.ink }}>{acc}%</div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint }}>정답률</div>
          </div>
        </div>
        <button
          onClick={onExit}
          style={{ marginTop: 18, border: "none", cursor: "pointer", borderRadius: 14, padding: "13px 32px", background: C.ink, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 14 }}
        >
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.paper, display: "flex", flexDirection: "column", zIndex: 50, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={20} color={C.inkSoft} />
        </button>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: C.inkSoft }}>
          {index + 1} / {queue.length}
        </div>
        <div style={{ width: 20 }} />
      </div>

      <div style={{ marginTop: 10 }}>
        <HLBar percent={(index / queue.length) * 100} color={C.blue} />
      </div>

      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          flex: 1, marginTop: 20, background: C.card, borderRadius: 22, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: flipped ? "flex-start" : "center",
          boxShadow: "0 2px 4px rgba(33,42,58,0.06), 0 8px 24px rgba(33,42,58,0.08)", padding: 24, textAlign: "center", gap: 12,
          overflowY: "auto",
        }}
      >
        {!flipped ? (
          <>
            {current.emoji && <div style={{ fontSize: 34 }}>{current.emoji}</div>}
            {current.pos && (
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, color: "#fff", background: C.blue, padding: "3px 10px", borderRadius: 999 }}>
                {current.pos}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 38, color: C.ink }}>
                {current.en}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); speakEN(current.en); }}
                style={{ border: "none", cursor: "pointer", background: C.paper, borderRadius: 999, padding: 8, display: "flex" }}
              >
                <Volume2 size={16} color={C.inkSoft} />
              </button>
            </div>
            {current.ipa && (
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: C.inkFaint }}>{current.ipa}</div>
            )}
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkFaint, marginTop: 8 }}>
              탭해서 뜻 확인하기
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: C.inkFaint }}>{current.en}</div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 900, fontSize: 26, color: C.ink }}>{current.ko}</div>
            {current.example && (
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, color: C.inkSoft, fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>
                “{current.example}”
              </div>
            )}
            <LearnTools word={current} onGenerate={onGenerateTools} />
          </>
        )}
      </div>

      {flipped ? (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <GradeBtn label="몰라요" color={C.danger} onClick={() => handleGrade(0)} />
          <GradeBtn label="애매해요" color={C.yellow} dark onClick={() => handleGrade(1)} />
          <GradeBtn label="알아요" color={C.mint} onClick={() => handleGrade(2)} />
        </div>
      ) : (
        <div style={{ height: 16 + 44 }} />
      )}
    </div>
  );
}

function GradeBtn({ label, color, onClick, dark }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: "none", cursor: "pointer", borderRadius: 14, padding: "13px 0",
        background: color, color: dark ? C.ink : "#fff",
        fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

/* ---------------------------------------------------------------
   WORD BANK SCREEN
----------------------------------------------------------------*/
function WordBankScreen({ words, onGenerateTools }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("전체");
  const [dayFilter, setDayFilter] = useState("전체");
  const [openId, setOpenId] = useState(null);

  const sources = useMemo(() => Array.from(new Set(words.map((w) => w.source).filter(Boolean))), [words]);
  const tags = ["전체", ...sources, "오답"];

  const days = useMemo(() => {
    if (filter === "전체" || filter === "오답") return [];
    const present = Array.from(new Set(words.filter((w) => w.source === filter && w.day).map((w) => w.day)));
    return present.sort();
  }, [words, filter]);

  useEffect(() => { setDayFilter("전체"); }, [filter]);

  const filtered = words.filter((w) => {
    const matchQ = q.trim() === "" || w.en.toLowerCase().includes(q.toLowerCase()) || w.ko.includes(q);
    const matchTag =
      filter === "전체" ? true :
      filter === "오답" ? w.wrongCount > 0 :
      w.source === filter;
    const matchDay = dayFilter === "전체" || w.day === dayFilter;
    return matchQ && matchTag && matchDay;
  });

  const RENDER_CAP = 200;
  const shown = filtered.slice(0, RENDER_CAP);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>
      <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 19, color: C.ink }}>내 단어장</div>

      <div style={{ position: "relative" }}>
        <Search size={15} color={C.inkFaint} style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="영어 또는 뜻으로 검색"
          style={{
            width: "100%", boxSizing: "border-box", border: `1px solid ${C.paperLine}`, borderRadius: 12,
            padding: "10px 12px 10px 34px", fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13,
            background: C.card, outline: "none", color: C.ink,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
        {tags.map((t) => (
          <Chip key={t} color={C.blue} active={filter === t} onClick={() => setFilter(t)}>{t}</Chip>
        ))}
      </div>

      {days.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          <Chip color={C.purple} active={dayFilter === "전체"} onClick={() => setDayFilter("전체")}>전체 Day</Chip>
          {days.map((d) => (
            <Chip key={d} color={C.purple} active={dayFilter === d} onClick={() => setDayFilter(d)}>{d}</Chip>
          ))}
        </div>
      )}

      <Card style={{ padding: "4px 4px" }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, color: C.inkFaint }}>
            검색 결과가 없어요.
          </div>
        )}
        {shown.map((w, i) => {
          const open = openId === w.id;
          return (
            <div key={w.id} style={{ borderBottom: i < shown.length - 1 ? `1px solid ${C.paperLine}` : "none" }}>
              <div
                onClick={() => setOpenId(open ? null : w.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", cursor: "pointer" }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>{w.en}</span>
                    {w.wrongCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.pink, background: "#FFEAF0", borderRadius: 999, padding: "1px 6px", fontFamily: "'Noto Sans KR', sans-serif" }}>
                        오답 {w.wrongCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkFaint, marginTop: 1 }}>{w.ko}</div>
                </div>
                <ChevronDown size={16} color={C.inkFaint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </div>
              {open && (
                <div style={{ padding: "0 12px 14px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); speakEN(w.en); }}
                      style={{ border: "none", cursor: "pointer", background: C.paper, borderRadius: 999, padding: 6, display: "flex" }}
                    >
                      <Volume2 size={13} color={C.inkSoft} />
                    </button>
                    {w.ipa && <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: C.inkFaint }}>{w.ipa}</span>}
                    {w.emoji && <span style={{ fontSize: 16 }}>{w.emoji}</span>}
                  </div>
                  {w.example && (
                    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkSoft, fontStyle: "italic", marginBottom: 8 }}>
                      “{w.example}”
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 14, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, marginBottom: 4 }}>
                    <span>다음 복습: {w.reps === 0 ? "학습 전" : w.dueDate}</span>
                    <span>틀린 횟수: {w.wrongCount}회</span>
                  </div>
                  <LearnTools word={w} compact onGenerate={onGenerateTools} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
      {filtered.length > RENDER_CAP && (
        <div style={{ textAlign: "center", fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint }}>
          총 {filtered.length}개 중 {RENDER_CAP}개 표시 중 · 검색이나 Day 필터로 좁혀보세요
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   IMPORT SCREEN
----------------------------------------------------------------*/
function ImportScreen({ onAddWords, onAppendBook, onReplaceBook, wordCount }) {
  const [mode, setMode] = useState("paste");
  const [text, setText] = useState("");
  const [banner, setBanner] = useState(null);

  // xlsx/csv book-switch state
  const [bookRows, setBookRows] = useState([]); // [{en, ko, day}]
  const [bookTitle, setBookTitle] = useState("");
  const [bookFileName, setBookFileName] = useState("");
  const [bookParsing, setBookParsing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // photo OCR state
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoMime, setPhotoMime] = useState("image/jpeg");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState([]); // [{en, ko, include}]

  const methods = [
    { id: "photo", label: "사진 촬영", icon: Camera, ready: true },
    { id: "excel", label: "단어장 업로드", icon: UploadCloud, ready: true },
    { id: "paste", label: "붙여넣기", icon: ClipboardPaste, ready: true },
    { id: "pdf", label: "PDF 가져오기", icon: FileText, ready: false },
    { id: "voice", label: "음성 입력", icon: Mic, ready: false },
    { id: "ai", label: "AI 추천 단어", icon: Wand2, ready: false },
  ];

  const handleParse = () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      const parts = line.includes(",") ? line.split(",") : line.split("-");
      const en = (parts[0] || "").trim();
      const ko = (parts[1] || "").trim();
      return en && ko ? { en, ko } : null;
    }).filter(Boolean);
    if (parsed.length === 0) {
      setBanner({ type: "error", msg: "형식을 확인해주세요. 예) approach, 접근하다" });
      return;
    }
    onAddWords(parsed);
    setBanner({ type: "success", msg: `${parsed.length}개 단어를 추가했어요!` });
    setText("");
  };

  const EN_HEADERS = ["영단어", "단어", "word", "english", "en", "표제어"];
  const KO_HEADERS = ["한글뜻", "뜻", "의미", "meaning", "korean", "ko", "해석"];
  const DAY_HEADERS = ["범위", "day", "unit", "챕터", "chapter", "과", "그룹"];

  const resetBook = () => {
    setBookRows([]);
    setBookTitle("");
    setBookFileName("");
    setConfirmReplace(false);
    setBanner(null);
  };

  const handleBookFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBookParsing(true);
    setBanner(null);
    setBookFileName(file.name);
    const defaultTitle = file.name.replace(/\.(xlsx|xls|csv)$/i, "");
    setBookTitle(defaultTitle);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!rows || rows.length < 2) {
          setBanner({ type: "error", msg: "표에서 데이터를 찾지 못했어요." });
          setBookParsing(false);
          return;
        }
        const header = rows[0].map((h) => String(h || "").trim().toLowerCase());
        const findCol = (candidates) => header.findIndex((h) => candidates.some((c) => h.includes(c)));
        const enIdx = findCol(EN_HEADERS);
        const koIdx = findCol(KO_HEADERS);
        const dayIdx = findCol(DAY_HEADERS);

        if (enIdx === -1 || koIdx === -1) {
          setBanner({ type: "error", msg: "영단어/한글뜻 컬럼을 찾지 못했어요. 헤더 이름을 확인해주세요." });
          setBookParsing(false);
          return;
        }

        const parsed = rows.slice(1)
          .map((r) => ({
            en: String(r[enIdx] || "").trim(),
            ko: String(r[koIdx] || "").trim(),
            day: dayIdx > -1 ? String(r[dayIdx] || "").trim() : undefined,
          }))
          .filter((r) => r.en && r.ko);

        if (parsed.length === 0) {
          setBanner({ type: "error", msg: "유효한 단어를 찾지 못했어요." });
        } else {
          setBookRows(parsed);
        }
      } catch (err) {
        setBanner({ type: "error", msg: "파일을 읽지 못했어요. xlsx/xls/csv 파일인지 확인해주세요." });
      } finally {
        setBookParsing(false);
      }
    };
    reader.onerror = () => { setBanner({ type: "error", msg: "파일을 읽지 못했어요." }); setBookParsing(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleAppendBookClick = async () => {
    if (!bookRows.length) return;
    const added = await onAppendBook(bookRows, bookTitle.trim() || "업로드한 단어장");
    setBanner({ type: "success", msg: `${added}개 단어를 추가했어요! (중복 ${bookRows.length - added}개 제외)` });
    resetBook();
  };

  const handleReplaceBookClick = async () => {
    if (!bookRows.length) return;
    const count = await onReplaceBook(bookRows, bookTitle.trim() || "업로드한 단어장");
    setBanner({ type: "success", msg: `단어장을 "${bookTitle}"(${count}개)로 전환했어요!` });
    resetBook();
  };

  const bookDayCount = useMemo(() => new Set(bookRows.map((r) => r.day).filter(Boolean)).size, [bookRows]);

  const resetPhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    setExtracted([]);
    setBanner(null);
  };

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setPhotoBase64(String(reader.result).split(",")[1] || null);
      setPhotoMime(file.type || "image/jpeg");
      setExtracted([]);
      setBanner(null);
    };
    reader.onerror = () => setBanner({ type: "error", msg: "이미지를 불러오지 못했어요." });
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!photoBase64) return;
    setExtracting(true);
    setBanner(null);
    try {
      const res = await fetch(CLAUDE_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: photoMime, data: photoBase64 } },
              {
                type: "text",
                text: "이 이미지는 영단어 학습 교재의 한 페이지야. 사진에 보이는 영단어와 그에 대응하는 한국어 뜻을 최대한 정확히 읽어줘. " +
                  "다른 설명이나 마크다운 없이, 아래 형식의 JSON 배열만 출력해: " +
                  "[{\"en\":\"영단어\",\"ko\":\"한국어 뜻\"}]",
              },
            ],
          }],
        }),
      });
      const data = await res.json();
      const raw = (data.content || []).map((b) => b.text || "").join("\n");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setBanner({ type: "error", msg: "단어를 찾지 못했어요. 더 선명한 사진으로 다시 시도해보세요." });
      } else {
        setExtracted(parsed.map((p) => ({ en: (p.en || "").trim(), ko: (p.ko || "").trim(), include: true })));
      }
    } catch (e) {
      setBanner({ type: "error", msg: "추출 중 오류가 발생했어요. 다시 시도해주세요." });
    } finally {
      setExtracting(false);
    }
  };

  const updateExtracted = (i, field, value) => {
    setExtracted((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };

  const handleConfirmAdd = () => {
    const toAdd = extracted
      .filter((it) => it.include && it.en.trim() && it.ko.trim())
      .map((it) => ({ en: it.en.trim(), ko: it.ko.trim() }));
    if (toAdd.length === 0) {
      setBanner({ type: "error", msg: "추가할 단어를 하나 이상 선택해주세요." });
      return;
    }
    onAddWords(toAdd);
    setBanner({ type: "success", msg: `${toAdd.length}개 단어를 추가했어요!` });
    resetPhoto();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
      <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 19, color: C.ink }}>단어 가져오기</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {methods.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setBanner(null); }}
              style={{
                position: "relative", border: "none", cursor: "pointer", textAlign: "left",
                borderRadius: 14, padding: "14px 12px", background: active ? C.purple : C.card,
                boxShadow: active ? "none" : "inset 0 0 0 1px " + C.paperLine,
              }}
            >
              <Icon size={18} color={active ? "#fff" : C.purple} />
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 12.5, color: active ? "#fff" : C.ink, marginTop: 8 }}>
                {m.label}
              </div>
              {!m.ready && (
                <span style={{
                  position: "absolute", top: 10, right: 10, fontSize: 9, fontWeight: 700,
                  color: active ? "#fff" : C.inkFaint, fontFamily: "'Noto Sans KR', sans-serif",
                  background: active ? "rgba(255,255,255,0.25)" : C.paper, padding: "2px 6px", borderRadius: 999,
                }}>
                  곧 지원
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode === "paste" && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkFaint, marginBottom: 8 }}>
            한 줄에 하나씩, <b>단어, 뜻</b> 형식으로 붙여넣어주세요.
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"예시)\nresilient, 회복력 있는\nallocate, 할당하다"}
            rows={6}
            style={{
              width: "100%", boxSizing: "border-box", border: `1px solid ${C.paperLine}`, borderRadius: 12,
              padding: 12, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, resize: "vertical",
              outline: "none", color: C.ink,
            }}
          />
          <button
            onClick={handleParse}
            style={{
              marginTop: 10, width: "100%", border: "none", cursor: "pointer", borderRadius: 12, padding: "12px 0",
              background: C.purple, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 14,
            }}
          >
            단어장에 추가
          </button>
          {banner && (
            <div style={{
              marginTop: 10, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              background: banner.type === "success" ? "#E7F9F1" : "#FDECEA",
              color: banner.type === "success" ? "#1F8F62" : C.danger,
            }}>
              {banner.msg}
            </div>
          )}
        </Card>
      )}

      {mode === "photo" && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkFaint, marginBottom: 10, lineHeight: 1.5 }}>
            학습 교재를 촬영하면 AI가 단어와 뜻을 읽어드려요. <b>추출 결과는 꼭 확인하고</b> 필요한 것만 골라 추가하세요.
          </div>

          <input
            id="photoUploadInput"
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
          />

          {!photoPreview ? (
            <label
              htmlFor="photoUploadInput"
              style={{
                width: "100%", border: `1.5px dashed ${C.paperLine}`, borderRadius: 12, padding: "30px 0",
                background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                boxSizing: "border-box",
              }}
            >
              <Camera size={22} color={C.purple} />
              <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, fontWeight: 700, color: C.inkSoft }}>
                사진 촬영 / 앨범에서 선택
              </span>
            </label>
          ) : (
            <div>
              <img src={photoPreview} alt="업로드한 페이지" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={resetPhoto}
                  style={{ flex: 1, padding: "10px 0", border: `1px solid ${C.paperLine}`, background: "#fff", borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: C.inkSoft, cursor: "pointer" }}
                >
                  다시 찍기
                </button>
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  style={{
                    flex: 1, padding: "10px 0", border: "none", background: C.purple, borderRadius: 10,
                    fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff",
                    cursor: extracting ? "default" : "pointer", opacity: extracting ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  {extracting ? (<><Loader2 size={14} className="animate-spin" /> 읽는 중...</>) : "텍스트 추출하기"}
                </button>
              </div>
            </div>
          )}

          {extracted.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 8 }}>
                추출 결과 · 확인 후 선택하세요 ({extracted.filter((e) => e.include).length}/{extracted.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {extracted.map((it, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10,
                    background: it.include ? C.paper : "#F2F2F2",
                  }}>
                    <button
                      onClick={() => updateExtracted(i, "include", !it.include)}
                      style={{
                        border: "none", flexShrink: 0, borderRadius: 6, width: 22, height: 22, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: it.include ? C.mint : "#fff",
                        boxShadow: it.include ? "none" : `inset 0 0 0 1px ${C.paperLine}`,
                      }}
                    >
                      {it.include && <Check size={13} color="#fff" />}
                    </button>
                    <input
                      value={it.en}
                      onChange={(e) => updateExtracted(i, "en", e.target.value)}
                      style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: C.ink }}
                    />
                    <input
                      value={it.ko}
                      onChange={(e) => updateExtracted(i, "ko", e.target.value)}
                      style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkSoft }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleConfirmAdd}
                style={{
                  marginTop: 10, width: "100%", border: "none", cursor: "pointer", borderRadius: 12, padding: "12px 0",
                  background: C.ink, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 14,
                }}
              >
                선택한 단어 단어장에 추가
              </button>
            </div>
          )}

          {banner && (
            <div style={{
              marginTop: 10, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              background: banner.type === "success" ? "#E7F9F1" : "#FDECEA",
              color: banner.type === "success" ? "#1F8F62" : C.danger,
            }}>
              {banner.msg}
            </div>
          )}
        </Card>
      )}

      {mode === "excel" && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkFaint, marginBottom: 10, lineHeight: 1.5 }}>
            다른 단어장(엑셀/CSV)을 올리면 지금 쓰는 단어장에 <b>추가</b>하거나, 통째로 <b>전환</b>할 수 있어요.
            헤더에 <b>영단어 / 한글뜻</b> 컬럼이 있으면 자동으로 인식합니다 (Day·범위 컬럼이 있으면 Day별 필터도 생겨요).
          </div>

          <input
            id="bookUploadInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleBookFile}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
          />

          {bookRows.length === 0 ? (
            <label
              htmlFor="bookUploadInput"
              style={{
                width: "100%", border: `1.5px dashed ${C.paperLine}`, borderRadius: 12, padding: "30px 0",
                background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                boxSizing: "border-box",
              }}
            >
              {bookParsing ? <Loader2 size={22} color={C.purple} className="animate-spin" /> : <UploadCloud size={22} color={C.purple} />}
              <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, fontWeight: 700, color: C.inkSoft }}>
                {bookParsing ? "읽는 중..." : "엑셀(xlsx) / CSV 파일 선택"}
              </span>
            </label>
          ) : (
            <div>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, marginBottom: 6 }}>
                단어장 이름
              </div>
              <input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", border: `1px solid ${C.paperLine}`, borderRadius: 10,
                  padding: "9px 12px", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13,
                  outline: "none", color: C.ink, marginBottom: 10,
                }}
              />

              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <MiniStat label="인식된 단어" value={`${bookRows.length}개`} color={C.purple} />
                {bookDayCount > 0 && <MiniStat label="Day 구성" value={`${bookDayCount}개`} color={C.blue} />}
              </div>

              <div style={{ maxHeight: 140, overflowY: "auto", border: `1px solid ${C.paperLine}`, borderRadius: 10, marginBottom: 12 }}>
                {bookRows.slice(0, 8).map((r, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 8, padding: "7px 10px", fontSize: 12,
                    borderBottom: i < 7 ? `1px solid ${C.paperLine}` : "none",
                  }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: C.ink, flexShrink: 0 }}>{r.en}</span>
                    <span style={{ fontFamily: "'Noto Sans KR', sans-serif", color: C.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ko}</span>
                  </div>
                ))}
                {bookRows.length > 8 && (
                  <div style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'Noto Sans KR', sans-serif", color: C.inkFaint }}>
                    외 {bookRows.length - 8}개...
                  </div>
                )}
              </div>

              {!confirmReplace ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={handleAppendBookClick}
                    style={{ width: "100%", border: "none", cursor: "pointer", borderRadius: 12, padding: "12px 0", background: C.purple, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 14 }}
                  >
                    기존 단어장에 추가 (현재 {wordCount}개 + 새 단어)
                  </button>
                  <button
                    onClick={() => setConfirmReplace(true)}
                    style={{ width: "100%", border: `1px solid ${C.danger}`, cursor: "pointer", borderRadius: 12, padding: "12px 0", background: "#fff", color: C.danger, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 14 }}
                  >
                    이 단어장으로 완전히 전환
                  </button>
                  <button
                    onClick={resetBook}
                    style={{ width: "100%", border: "none", cursor: "pointer", borderRadius: 12, padding: "10px 0", background: "none", color: C.inkFaint, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 12 }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div style={{ padding: 12, borderRadius: 12, background: "#FDECEA" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                    <Trash2 size={16} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12.5, color: C.danger, lineHeight: 1.5 }}>
                      현재 단어장의 <b>{wordCount}개 단어와 학습 기록이 모두 사라지고</b>, "{bookTitle}" {bookRows.length}개로 완전히 바뀝니다. 연속 학습일·뱃지는 유지돼요. 계속할까요?
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConfirmReplace(false)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${C.paperLine}`, background: "#fff", borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: C.inkSoft, cursor: "pointer" }}>취소</button>
                    <button onClick={handleReplaceBookClick} style={{ flex: 1, padding: "10px 0", border: "none", background: C.danger, borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>전환하기</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {banner && (
            <div style={{
              marginTop: 10, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
              background: banner.type === "success" ? "#E7F9F1" : "#FDECEA",
              color: banner.type === "success" ? "#1F8F62" : C.danger,
            }}>
              {banner.msg}
            </div>
          )}
        </Card>
      )}

      {mode !== "paste" && mode !== "photo" && mode !== "excel" && (
        <Card style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, color: C.inkFaint }}>
            이 방식은 다음 업데이트에서 지원 예정이에요.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   ANALYSIS SCREEN
----------------------------------------------------------------*/
function AnalysisScreen({ words, sessions, badges }) {
  const total = words.length;
  const mastered = words.filter((w) => w.interval >= 21).length;
  const weak = words.filter((w) => w.wrongCount >= 3).length;

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const iso = addDays(todayISO(), -i);
      const s = sessions.find((s) => s.date === iso);
      const acc = s && s.studied ? Math.round((s.correct / s.studied) * 100) : 0;
      days.push({ day: weekdayKR(iso), acc });
    }
    return days;
  }, [sessions]);

  const weekAvg = Math.round(chartData.reduce((a, d) => a + d.acc, 0) / chartData.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
      <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 19, color: C.ink }}>학습 분석</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <MiniStat label="총 단어" value={`${total}개`} />
        <MiniStat label="암기 완료" value={`${mastered}개`} color={C.mint} />
        <MiniStat label="취약 단어" value={`${weak}개`} color={C.pink} />
        <MiniStat label="이번 주 평균 정답률" value={`${isNaN(weekAvg) ? 0 : weekAvg}%`} color={C.blue} />
      </div>

      <Card style={{ padding: "16px 12px 8px 4px" }}>
        <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, fontWeight: 700, color: C.inkSoft, marginLeft: 12, marginBottom: 4 }}>
          최근 7일 정답률
        </div>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={C.paperLine} />
              <XAxis dataKey="day" tick={{ fontFamily: "Noto Sans KR", fontSize: 11, fill: "#66707E" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "Space Grotesk", fontSize: 10, fill: "#98A1AC" }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: "rgba(91,155,216,0.08)" }}
                contentStyle={{ fontFamily: "Noto Sans KR", fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="acc" fill={C.blue} radius={[6, 6, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 18, color: C.ink, marginBottom: 8 }}>
          🏅 모은 뱃지 ({badges.length}/{BADGES.length})
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {BADGES.map((b) => {
            const Icon = b.icon;
            const earned = badges.includes(b.id);
            return (
              <Card key={b.id} style={{
                padding: "14px 8px", textAlign: "center", opacity: earned ? 1 : 0.55,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 999, margin: "0 auto 8px",
                  background: earned ? b.color + "26" : C.paper,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {earned ? <Icon size={18} color={b.color} /> : <Lock size={15} color={C.inkFaint} />}
                </div>
                <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, color: earned ? C.ink : C.inkFaint }}>
                  {b.label}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = C.ink }) {
  return (
    <Card style={{ padding: "14px 14px" }}>
      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color, marginTop: 3 }}>{value}</div>
    </Card>
  );
}

/* ---------------------------------------------------------------
   BOTTOM NAV
----------------------------------------------------------------*/
function BottomNav({ tab, setTab }) {
  const items = [
    { id: "home", label: "홈", icon: HomeIcon, color: C.yellow },
    { id: "bank", label: "단어장", icon: BookOpen, color: C.blue },
    { id: "learn", label: "학습하기", icon: GraduationCap, color: C.pink },
    { id: "import", label: "가져오기", icon: Camera, color: C.purple },
    { id: "analysis", label: "분석", icon: BarChart3, color: C.mint },
  ];
  return (
    <div style={{
      position: "sticky", bottom: 0, left: 0, right: 0, background: C.card,
      boxShadow: "0 -1px 10px rgba(33,42,58,0.08)", display: "flex", zIndex: 30,
    }}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              padding: "9px 0 8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              borderTop: `3px solid ${active ? it.color : "transparent"}`,
            }}
          >
            <Icon size={18} color={active ? it.color : C.inkFaint} strokeWidth={active ? 2.4 : 2} />
            <span style={{
              fontFamily: "'Noto Sans KR', sans-serif", fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? C.ink : C.inkFaint,
            }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   SETTINGS SHEET
----------------------------------------------------------------*/
function SettingsSheet({ onClose, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState(null);
  const [syncCode, setSyncCode] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("vocab_sync_code");
        setSyncCode(r.value || "");
      } catch {}
    })();
  }, []);

  const saveCode = async (code) => {
    setSyncCode(code);
    try { await window.storage.set("vocab_sync_code", code); } catch {}
  };

  const handlePush = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const code = syncCode || suggestSyncCode();
      if (!syncCode) await saveCode(code);
      await pushToCloud(code);
      setSyncStatus({ type: "success", msg: `클라우드에 저장했어요. 다른 기기에서 이 코드로 불러올 수 있어요: ${code}` });
    } catch (e) {
      setSyncStatus({ type: "error", msg: e.message || "동기화에 실패했어요." });
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!syncCode.trim()) {
      setSyncStatus({ type: "error", msg: "먼저 동기화 코드를 입력해주세요." });
      return;
    }
    if (!window.confirm("이 기기의 현재 데이터가 클라우드 데이터로 덮어써져요. 계속할까요?")) return;
    setSyncing(true);
    setSyncStatus(null);
    try {
      await pullFromCloud(syncCode.trim());
      await saveCode(syncCode.trim());
      setSyncStatus({ type: "success", msg: "불러왔어요! 잠시 후 새로고침됩니다." });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setSyncStatus({ type: "error", msg: e.message || "불러오기에 실패했어요." });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const supported = typeof window !== "undefined" && !!window.speechSynthesis;
      if (!supported) { setVoiceInfo({ supported: false, count: 0, testOk: null }); return; }
      const voices = await getVoicesAsync();
      setVoiceInfo({ supported: true, count: voices.length, testOk: null });
    })();
  }, []);

  const runTest = async () => {
    const ok = await speakText("test", "en", { rate: 1 });
    setVoiceInfo((v) => ({ ...v, testOk: ok }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(33,42,58,0.45)" }} />
      <div style={{ position: "relative", width: "100%", background: C.card, borderRadius: "20px 20px 0 0", padding: "18px 20px 26px" }}>
        <div style={{ width: 36, height: 4, background: C.paperLine, borderRadius: 999, margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 18, color: C.ink, marginBottom: 14 }}>설정</div>

        <div style={{ padding: "10px 12px", background: C.paper, borderRadius: 10, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
            🔊 음성 진단
          </div>
          {voiceInfo ? (
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11.5, color: C.inkFaint, lineHeight: 1.6 }}>
              음성 API 지원: {voiceInfo.supported ? "예" : "아니오"}<br />
              사용 가능한 음성 수: {voiceInfo.count}개<br />
              {voiceInfo.testOk !== null && <>재생 테스트: {voiceInfo.testOk ? "호출 성공 (그래도 안 들리면 기기/환경 문제)" : "실패"}</>}
            </div>
          ) : (
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11.5, color: C.inkFaint }}>확인 중...</div>
          )}
          <button
            onClick={runTest}
            style={{ marginTop: 8, border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 12px", background: C.blue, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 11.5 }}
          >
            소리 테스트 (test)
          </button>
        </div>

        <div style={{ padding: "10px 12px", background: C.paper, borderRadius: 10, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>
            ☁️ 클라우드 동기화 / 백업
          </div>
          <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, color: C.inkFaint, marginBottom: 8, lineHeight: 1.5 }}>
            동기화 코드를 만들고 다른 기기에서 같은 코드를 입력하면 데이터를 이어서 쓸 수 있어요.
          </div>
          <input
            value={syncCode}
            onChange={(e) => setSyncCode(e.target.value)}
            placeholder="동기화 코드 (예: ab3de-fg7hk)"
            style={{
              width: "100%", boxSizing: "border-box", border: `1px solid ${C.paperLine}`, borderRadius: 8,
              padding: "8px 10px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
              outline: "none", color: C.ink, marginBottom: 8, background: "#fff",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handlePush}
              disabled={syncing}
              style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 999, padding: "8px 0", background: C.mint, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 11.5, opacity: syncing ? 0.6 : 1 }}
            >
              {syncing ? "처리 중..." : "클라우드에 저장"}
            </button>
            <button
              onClick={handlePull}
              disabled={syncing}
              style={{ flex: 1, border: `1px solid ${C.paperLine}`, cursor: "pointer", borderRadius: 999, padding: "8px 0", background: "#fff", color: C.inkSoft, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 11.5, opacity: syncing ? 0.6 : 1 }}
            >
              {syncing ? "처리 중..." : "이 기기로 불러오기"}
            </button>
          </div>
          {syncStatus && (
            <div style={{
              marginTop: 8, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, lineHeight: 1.5,
              color: syncStatus.type === "success" ? "#1F8F62" : C.danger,
            }}>
              {syncStatus.msg}
            </div>
          )}
        </div>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "10px 0", fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: C.danger, fontWeight: 700 }}
          >
            데이터 초기화
          </button>
        ) : (
          <div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>
              모든 학습 기록이 삭제돼요. 계속할까요?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${C.paperLine}`, background: "#fff", borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: C.inkSoft, cursor: "pointer" }}>취소</button>
              <button onClick={onReset} style={{ flex: 1, padding: "10px 0", border: "none", background: C.danger, borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>초기화</button>
            </div>
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", padding: "11px 0", border: "none", background: C.paper, borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13, color: C.inkSoft, cursor: "pointer" }}>
          닫기
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   ROOT APP
----------------------------------------------------------------*/
export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [words, setWords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState({ streak: 0, lastActiveDate: null, ddayTarget: "2028-11-16" });
  const [tab, setTab] = useState("home");
  const [inSession, setInSession] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [badges, setBadges] = useState([]);
  const [newBadge, setNewBadge] = useState(null);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  // Storage may be unavailable in some hosts — every call is isolated so a
  // missing/failing storage layer never blocks the app from rendering.
  const storageAvailable = typeof window !== "undefined" && !!window.storage;
  const safeGet = async (key) => {
    if (!storageAvailable) return null;
    try {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    } catch {
      return null;
    }
  };
  const safeSet = async (key, value) => {
    if (!storageAvailable) return;
    try { await window.storage.set(key, JSON.stringify(value)); } catch {}
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let w = await safeGet("vocab_words");
      if (!w) { w = seedWords(); safeSet("vocab_words", w); }

      let s = await safeGet("vocab_sessions");
      if (!s) { s = []; safeSet("vocab_sessions", s); }

      let m = await safeGet("vocab_meta");
      if (!m) { m = { streak: 0, lastActiveDate: null, ddayTarget: "2028-11-16" }; safeSet("vocab_meta", m); }

      let b = await safeGet("vocab_badges");
      if (!b) { b = []; safeSet("vocab_badges", b); }

      setWords(w);
      setSessions(s);
      setMeta(m);
      setBadges(b);
      setLoading(false);
    })();
  }, []);

  const persistWords = async (next) => { setWords(next); safeSet("vocab_words", next); };
  const persistSessions = async (next) => { setSessions(next); safeSet("vocab_sessions", next); };
  const persistMeta = async (next) => { setMeta(next); safeSet("vocab_meta", next); };

  const t = todayISO();
  const buckets = useMemo(() => {
    const newWordsAll = words.filter((w) => w.reps === 0);
    const newWords = newWordsAll.slice(0, DAILY_NEW_CAP);
    const dueReview = words.filter((w) => w.reps > 0 && w.wrongCount === 0 && w.dueDate <= t);
    const wrongReview = words.filter((w) => w.wrongCount > 0 && w.dueDate <= t);
    return { newWords, newWordsAll, dueReview, wrongReview };
  }, [words, t]);


  const queue = useMemo(() => [...buckets.wrongReview, ...buckets.dueReview, ...buckets.newWords], [buckets]);

  const weakWords = useMemo(
    () => [...words].filter((w) => w.wrongCount > 0).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 3),
    [words]
  );

  const ddayLeft = Math.max(0, diffDays(t, meta.ddayTarget));

  const todaysSession = sessions.find((s) => s.date === t);
  const totalDueAtLoad = buckets.newWords.length + buckets.dueReview.length + buckets.wrongReview.length + (todaysSession ? todaysSession.studied : 0);
  const todayProgress = totalDueAtLoad > 0
    ? Math.round(((todaysSession ? todaysSession.studied : 0) / totalDueAtLoad) * 100)
    : (todaysSession ? 100 : 0);

  const handleGradeInSession = (id, quality) => {
    const next = wordsRef.current.map((w) => (w.id === id ? gradeWord(w, quality) : w));
    persistWords(next);
  };

  const handleSessionExit = async () => {
    setInSession(false);
    // log session progress
    const graded = queue.filter((qw) => {
      const now = wordsRef.current.find((w) => w.id === qw.id);
      return now && now.lastReviewed === t;
    });
    if (graded.length > 0) {
      const correct = graded.filter((qw) => {
        const now = wordsRef.current.find((w) => w.id === qw.id);
        return now && now.wrongCount === 0;
      }).length;
      const existingIdx = sessions.findIndex((s) => s.date === t);
      let nextSessions;
      if (existingIdx >= 0) {
        nextSessions = sessions.map((s, i) => i === existingIdx ? { date: t, studied: graded.length, correct } : s);
      } else {
        nextSessions = [...sessions, { date: t, studied: graded.length, correct }];
      }
      await persistSessions(nextSessions);

      let nextMeta = { ...meta };
      if (meta.lastActiveDate !== t) {
        nextMeta.streak = meta.lastActiveDate === addDays(t, -1) ? meta.streak + 1 : 1;
        nextMeta.lastActiveDate = t;
        await persistMeta(nextMeta);
      }

      // evaluate achievement badges against the freshly updated data
      const latestWords = wordsRef.current;
      const masteredCount = latestWords.filter((w) => w.interval >= 21).length;
      const everReviewedCount = latestWords.filter((w) => w.reps > 0).length;
      const wrongReviewCount = latestWords.filter((w) => w.wrongCount > 0).length;
      const qualifying = evaluateBadges({
        streak: nextMeta.streak,
        sessionsCount: nextSessions.length,
        masteredCount,
        everReviewedCount,
        wrongReviewCount,
      });
      const freshlyEarned = qualifying.filter((id) => !badges.includes(id));
      if (freshlyEarned.length > 0) {
        const merged = [...badges, ...freshlyEarned];
        setBadges(merged);
        safeSet("vocab_badges", merged);
        setNewBadge(BADGES.find((b) => b.id === freshlyEarned[0]));
      }
    }
  };

  const handleAddWords = async (parsed, sourceLabel) => {
    const next = [
      ...words,
      ...parsed.map((p, i) => ({
        id: `w_custom_${Date.now()}_${i}`,
        en: p.en, pos: p.pos || "", ko: p.ko, example: p.example || "",
        source: sourceLabel || p.source || "직접추가", day: p.day || undefined,
        reps: 0, interval: 0, ease: 2.5, dueDate: t, wrongCount: 0, lastReviewed: null,
      })),
    ];
    await persistWords(next);
  };

  const handleAppendBook = async (parsed, bookTitle) => {
    const existingEn = new Set(words.map((w) => w.en.toLowerCase()));
    const uniqueNew = parsed.filter((p) => !existingEn.has(p.en.toLowerCase()));
    if (uniqueNew.length === 0) return 0;
    await handleAddWords(uniqueNew, bookTitle);
    return uniqueNew.length;
  };

  const handleReplaceBook = async (parsed, bookTitle) => {
    const fresh = parsed.map((p, i) => ({
      id: `w_book_${Date.now()}_${i}`,
      en: p.en, pos: "", ko: p.ko, example: "",
      source: bookTitle, day: p.day || undefined,
      reps: 0, interval: 0, ease: 2.5, dueDate: t, wrongCount: 0, lastReviewed: null,
    }));
    await persistWords(fresh);
    return fresh.length;
  };

  const handleGenerateTools = async (wordId) => {
    const word = wordsRef.current.find((w) => w.id === wordId);
    if (!word) return false;
    try {
      const res = await fetch(CLAUDE_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          messages: [{
            role: "user",
            content:
              `수능 영단어 학습 앱에 넣을 학습 도구를 만들어줘. 단어: "${word.en}", 뜻: "${word.ko}".\n` +
              "다른 설명이나 마크다운 없이 아래 형식의 JSON 객체만 출력해:\n" +
              "{\n" +
              '  "ipa": "국제음성기호 발음 표기 (예: /əˈfekt/)",\n' +
              '  "mnemonic": "발음이 비슷한 한국어 소리 + 재미있는 장면으로 뜻과 연결하는 연상법. 어원/접두사 설명은 절대 쓰지 말 것 (경선식 스타일).",\n' +
              '  "etymology": "라틴/그리스 어근을 접두사+어근 형태로 분해한 설명. mnemonic과 겹치지 않게 순수 어근 분석만.",\n' +
              '  "examSentence": "이 단어를 쓴 수능 스타일의 자연스러운 영어 예문 한 문장 (새로 창작, 기출 문장 그대로 베끼지 말 것)",\n' +
              '  "emoji": "이 단어의 의미를 표현하는 이모지 1개",\n' +
              '  "song": "단어 발음을 반복하며 뜻을 넣은 짧고 리듬감 있는 한국어 챈트 한 줄"\n' +
              "}",
          }],
        }),
      });
      const data = await res.json();
      const raw = (data.content || []).map((b) => b.text || "").join("\n");
      const clean = raw.replace(/```json|```/g, "").trim();
      const generated = JSON.parse(clean);
      const next = wordsRef.current.map((w) => (w.id === wordId ? { ...w, ...generated } : w));
      await persistWords(next);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleReset = async () => {
    const w = seedWords();
    await persistWords(w);
    await persistSessions([]);
    await persistMeta({ streak: 0, lastActiveDate: null, ddayTarget: "2028-11-16" });
    setBadges([]);
    safeSet("vocab_badges", []);
    setShowSettings(false);
    setTab("home");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{FONT_IMPORT}</style>
        <Loader2 size={26} color={C.inkSoft} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ fontFamily: "'Noto Sans KR', sans-serif", color: C.inkSoft }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.paper, maxWidth: 430, margin: "0 auto", position: "relative",
      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, ${C.paperLine} 28px)`,
    }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .screen-fade { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
      `}</style>

      {/* binder strip */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 0, width: 30,
        backgroundImage: `radial-gradient(circle at 15px 18px, #ffffff 5px, transparent 6px)`,
        backgroundSize: "30px 46px", backgroundRepeat: "repeat-y", background: C.marginStrip,
        backgroundColor: C.marginStrip,
      }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 30, width: 2, background: C.marginRule, opacity: 0.55 }} />

      <div style={{ position: "relative", paddingLeft: 46, paddingRight: 18, paddingBottom: inSession ? 0 : 4 }}>
        <Header onSettings={() => setShowSettings(true)} alertCount={buckets.wrongReview.length} />
        <div key={tab} className="screen-fade">
          {tab === "home" && (
            <HomeScreen
              buckets={buckets}
              meta={meta}
              ddayLeft={ddayLeft}
              todayProgress={todayProgress}
              weakWords={weakWords}
              onStart={() => setInSession(true)}
            />
          )}
          {tab === "bank" && <WordBankScreen words={words} onGenerateTools={handleGenerateTools} />}
          {tab === "import" && <ImportScreen onAddWords={handleAddWords} onAppendBook={handleAppendBook} onReplaceBook={handleReplaceBook} wordCount={words.length} />}
          {tab === "analysis" && <AnalysisScreen words={words} sessions={sessions} badges={badges} />}
          {tab === "learn" && (
            <div style={{ padding: "40px 4px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, color: C.inkFaint, marginBottom: 12 }}>
                홈 화면의 '학습 시작하기'로 오늘의 학습을 시작해보세요.
              </div>
              {queue.length > 0 && (
                <button
                  onClick={() => setInSession(true)}
                  style={{ border: "none", cursor: "pointer", borderRadius: 12, padding: "11px 22px", background: C.ink, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13 }}
                >
                  학습 시작하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!inSession && <BottomNav tab={tab} setTab={setTab} />}

      {inSession && (
        <LearnScreen
          queue={queue}
          onGrade={handleGradeInSession}
          onExit={() => { handleSessionExit(); setTab("home"); }}
          onGenerateTools={handleGenerateTools}
        />
      )}

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} onReset={handleReset} />}

      {newBadge && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={() => setNewBadge(null)} style={{ position: "absolute", inset: 0, background: "rgba(33,42,58,0.55)" }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 22, padding: "28px 24px", textAlign: "center", maxWidth: 300 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 999, margin: "0 auto 14px",
              background: newBadge.color + "26", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <newBadge.icon size={28} color={newBadge.color} />
            </div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, fontWeight: 700, color: C.inkFaint }}>🎉 새 뱃지 획득!</div>
            <div style={{ fontFamily: "'Gaegu', cursive", fontWeight: 700, fontSize: 22, color: C.ink, marginTop: 4 }}>{newBadge.label}</div>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: C.inkSoft, marginTop: 6 }}>{newBadge.desc}</div>
            <button
              onClick={() => setNewBadge(null)}
              style={{ marginTop: 18, border: "none", cursor: "pointer", borderRadius: 12, padding: "11px 28px", background: C.ink, color: "#fff", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 13 }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
