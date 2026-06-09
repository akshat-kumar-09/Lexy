/**
 * Genius little diagrams for each master-fact. Pure SVG, no client JS.
 * Shared palette tuned to Lexy's parchment/ink/gold world.
 */

const INK = "#1C1917";
const GOLD = "#8B7355";
const GOLD_SOFT = "#C8A878";
const LINE = "#D9D1C5";
const MUTED = "#B0A898";
const RED = "#BC5B3E";
const GREEN = "#1C7A40";
const CREAM = "#F5EFE0";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 240 120"
      className="h-full w-full"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  );
}

function AffectLabeling() {
  return (
    <Frame label="A jagged alarm waveform calming after a feeling is named">
      <polyline
        points="6,60 15,24 24,94 33,30 42,90 51,32 60,82 69,42 80,60"
        fill="none"
        stroke={RED}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x="92" y="46" width="56" height="28" rx="14" fill={INK} />
      <text x="120" y="65" textAnchor="middle" fontSize="13" fontWeight="700" fill={CREAM}>
        name it
      </text>
      <path
        d="M160 60 q12 -10 24 0 q12 10 24 0 q9 -7 18 0"
        fill="none"
        stroke={GREEN}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Frame>
  );
}

function Granularity() {
  const dots = [
    { x: 152, y: 38, c: GOLD },
    { x: 178, y: 38, c: GREEN },
    { x: 204, y: 38, c: RED },
    { x: 152, y: 64, c: GOLD_SOFT },
    { x: 178, y: 64, c: "#5B6B4A" },
    { x: 204, y: 64, c: "#7A5B86" },
    { x: 152, y: 90, c: "#3E6B7A" },
    { x: 178, y: 90, c: "#B07A3E" },
    { x: 204, y: 90, c: INK },
  ];
  return (
    <Frame label="One vague blob splitting into many precise colored dots">
      <circle cx="46" cy="64" r="30" fill="#E6E0D6" />
      <text x="46" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill={MUTED}>
        bad
      </text>
      <path d="M88 64 h26" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M110 59 l8 5 l-8 5" fill="none" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="9" fill={d.c} />
      ))}
    </Frame>
  );
}

function Mehrabian() {
  const C = 2 * Math.PI * 34;
  const seg = (p: number) => (p / 100) * C;
  const words = seg(7);
  const tone = seg(38);
  const body = seg(55);
  return (
    <Frame label="Donut chart: 55% body, 38% tone, 7% words">
      <g transform="rotate(-90 64 60)" fill="none" strokeWidth="16">
        <circle cx="64" cy="60" r="34" stroke={INK} strokeDasharray={`${body} ${C - body}`} strokeDashoffset="0" />
        <circle cx="64" cy="60" r="34" stroke={GOLD} strokeDasharray={`${tone} ${C - tone}`} strokeDashoffset={`${-body}`} />
        <circle cx="64" cy="60" r="34" stroke={GOLD_SOFT} strokeDasharray={`${words} ${C - words}`} strokeDashoffset={`${-(body + tone)}`} />
      </g>
      <g fontSize="11" fontWeight="600">
        <circle cx="128" cy="40" r="5" fill={INK} />
        <text x="140" y="44" fill={INK}>55% body</text>
        <circle cx="128" cy="60" r="5" fill={GOLD} />
        <text x="140" y="64" fill={GOLD}>38% tone</text>
        <circle cx="128" cy="80" r="5" fill={GOLD_SOFT} />
        <text x="140" y="84" fill={MUTED}>7% words</text>
      </g>
    </Frame>
  );
}

function Prosody() {
  const xs = [44, 76, 108, 140, 172];
  const rows = [
    { y: 16, hi: 0 },
    { y: 50, hi: 2 },
    { y: 84, hi: 4 },
  ];
  return (
    <Frame label="Same five word-blocks, a different one stressed in each row">
      {rows.map((row, ri) =>
        xs.map((x, i) => {
          const on = i === row.hi;
          return (
            <g key={`${ri}-${i}`}>
              {on && (
                <path d={`M${x + 13} ${row.y - 4} l5 6 l-10 0 z`} fill={GOLD} />
              )}
              <rect
                x={x}
                y={on ? row.y + 2 : row.y + 4}
                width="26"
                height="14"
                rx="4"
                fill={on ? GOLD : "#EAE3D8"}
                stroke={on ? GOLD : LINE}
                strokeWidth="1.5"
              />
            </g>
          );
        })
      )}
    </Frame>
  );
}

function McGurk() {
  return (
    <Frame label="Eye sees ga plus ear hears ba equals brain reports da">
      <g>
        <ellipse cx="32" cy="50" rx="20" ry="12" fill="none" stroke={INK} strokeWidth="2.5" />
        <circle cx="32" cy="50" r="5.5" fill={INK} />
        <text x="32" y="82" textAnchor="middle" fontSize="13" fontWeight="700" fill={GOLD}>ga</text>
      </g>
      <text x="72" y="55" textAnchor="middle" fontSize="18" fill={MUTED}>+</text>
      <g>
        <path d="M96 60 q-4 -24 16 -24 q18 0 16 18 q-1 9 -9 9 q-6 0 -6 6 q0 7 -7 7" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <text x="110" y="92" textAnchor="middle" fontSize="13" fontWeight="700" fill={GOLD}>ba</text>
      </g>
      <text x="152" y="55" textAnchor="middle" fontSize="18" fill={MUTED}>=</text>
      <rect x="176" y="36" width="50" height="30" rx="15" fill={INK} />
      <text x="201" y="56" textAnchor="middle" fontSize="14" fontWeight="700" fill={CREAM}>da</text>
      <text x="201" y="86" textAnchor="middle" fontSize="10" fontWeight="600" fill={MUTED}>you hear</text>
    </Frame>
  );
}

function LinguisticRelativity() {
  return (
    <Frame label="One blue gradient bar; English names it once, Russian splits it in two">
      <defs>
        <linearGradient id="blueband" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B7D6EE" />
          <stop offset="100%" stopColor="#2E5A86" />
        </linearGradient>
      </defs>
      <text x="120" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
        {"EN: \u201cblue\u201d"}
      </text>
      <path d="M20 30 v6 h200 v-6" fill="none" stroke={MUTED} strokeWidth="1.5" />
      <rect x="20" y="44" width="200" height="26" rx="6" fill="url(#blueband)" />
      <path d="M20 84 v-6 h95 v6 M125 84 v-6 h95 v6" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <text x="67" y="100" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={GOLD}>goluboy</text>
      <text x="173" y="100" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={GOLD}>siniy</text>
    </Frame>
  );
}

function Pause() {
  const left = [10, 20, 30, 40, 50, 60, 72];
  const right = [168, 180, 190, 200, 210, 220, 230];
  const h = [18, 34, 26, 44, 24, 38, 20];
  return (
    <Frame label="A speech waveform with a deliberate highlighted silence in the middle">
      {left.map((x, i) => (
        <rect key={`l${i}`} x={x} y={60 - h[i]! / 2} width="6" height={h[i]} rx="3" fill={GOLD} />
      ))}
      <rect x="86" y="40" width="68" height="40" rx="10" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 4" />
      <text x="120" y="65" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>pause</text>
      {right.map((x, i) => (
        <rect key={`r${i}`} x={x} y={60 - h[i]! / 2} width="6" height={h[i]} rx="3" fill={GOLD} />
      ))}
    </Frame>
  );
}

function Gesture() {
  return (
    <Frame label="A gesturing hand sending sparks of thought to a lightbulb">
      <g stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="34" y="64" width="34" height="26" rx="7" />
        <line x1="40" y1="64" x2="40" y2="48" />
        <line x1="49" y1="64" x2="49" y2="44" />
        <line x1="58" y1="64" x2="58" y2="46" />
        <line x1="68" y1="70" x2="80" y2="62" />
      </g>
      <path d="M86 56 q18 -10 34 -8" stroke={GOLD} strokeWidth="2" strokeDasharray="2 5" fill="none" strokeLinecap="round" />
      <g stroke={GOLD} strokeWidth="2.5" fill="none" strokeLinecap="round">
        <circle cx="168" cy="46" r="17" />
        <path d="M161 70 h14 M163 76 h10" />
      </g>
      <g stroke={GOLD_SOFT} strokeWidth="2" strokeLinecap="round">
        <line x1="168" y1="18" x2="168" y2="24" />
        <line x1="192" y1="30" x2="187" y2="34" />
        <line x1="144" y1="30" x2="149" y2="34" />
      </g>
    </Frame>
  );
}

function WarmthCompetence() {
  return (
    <Frame label="Warmth judged first as step one, competence second">
      <text x="40" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={GOLD}>1st</text>
      <path
        d="M40 50 c-7 -12 -26 -4 -26 9 c0 11 16 20 26 28 c10 -8 26 -17 26 -28 c0 -13 -19 -21 -26 -9 z"
        fill={GOLD}
      />
      <text x="40" y="104" textAnchor="middle" fontSize="11" fontWeight="600" fill={GOLD}>warmth</text>
      <path d="M86 64 h26" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M108 59 l8 5 l-8 5" fill="none" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="178" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={MUTED}>2nd</text>
      <path
        d="M178 42 l20 7 v12 c0 14 -12 22 -20 27 c-8 -5 -20 -13 -20 -27 v-12 z"
        fill="none"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M170 64 l6 7 l12 -14" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="178" y="104" textAnchor="middle" fontSize="11" fontWeight="600" fill={MUTED}>competence</text>
    </Frame>
  );
}

function CurseOfKnowledge() {
  return (
    <Frame label="A staircase whose lower steps fade away as a figure stands at the top">
      <polyline
        points="14,104 14,90 54,90 54,76 94,76"
        fill="none"
        stroke={LINE}
        strokeWidth="2.5"
        strokeDasharray="5 5"
        strokeLinejoin="round"
      />
      <polyline
        points="94,76 94,60 134,60 134,44 174,44 174,30 206,30"
        fill="none"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text x="34" y="84" fontSize="16" fontWeight="700" fill={MUTED}>?</text>
      <circle cx="196" cy="18" r="6" fill={GOLD} />
      <line x1="196" y1="24" x2="196" y2="30" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  );
}

function Mirroring() {
  return (
    <Frame label="Two waveforms starting out of phase and converging into rhythm">
      <path
        d="M10,60 C36,34 58,34 84,60 C110,86 132,86 158,60 C184,34 206,34 230,60"
        fill="none"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M10,78 C36,70 58,70 84,72 C110,80 132,84 158,62 C184,36 206,33 230,60"
        fill="none"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="230" cy="60" r="4.5" fill={GREEN} />
    </Frame>
  );
}

function Story() {
  return (
    <Frame label="Two heads glowing in sync, connected by a bridge of light">
      {[60, 180].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="56" r="24" fill="none" stroke={INK} strokeWidth="2.5" />
          <circle cx={cx} cy="56" r="11" fill={GOLD} opacity="0.85" />
        </g>
      ))}
      <g fill={GOLD_SOFT}>
        {[96, 112, 128, 144].map((x, i) => (
          <circle key={x} cx={x} cy={56 - (i % 2 === 0 ? 4 : -4)} r={i % 2 === 0 ? 3.5 : 4.5} />
        ))}
      </g>
      <path d="M96 56 q24 -16 48 0" fill="none" stroke={GOLD_SOFT} strokeWidth="1.5" opacity="0.6" />
    </Frame>
  );
}

const MAP: Record<string, () => React.ReactElement> = {
  "affect-labeling": AffectLabeling,
  granularity: Granularity,
  mehrabian: Mehrabian,
  prosody: Prosody,
  mcgurk: McGurk,
  "linguistic-relativity": LinguisticRelativity,
  pause: Pause,
  gesture: Gesture,
  "warmth-competence": WarmthCompetence,
  "curse-of-knowledge": CurseOfKnowledge,
  mirroring: Mirroring,
  story: Story,
};

export function FactVisual({ id }: { id: string }) {
  const Visual = MAP[id];
  if (!Visual) return null;
  return <Visual />;
}
