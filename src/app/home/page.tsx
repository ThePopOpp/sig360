import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { FaqAccordion, type FaqItem } from '@/components/marketing/FaqAccordion';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | SIG360" template so the public
  // page keeps the firm's own title.
  title: { absolute: 'Strategic Income Group — Comprehensive Financial Planning' },
  description:
    'Get proactive, values-driven advice for planning, investing, and legacy — coordinated in one place.',
};

/* ─── Shared class recipes ─────────────────────────────── */

const WRAP = 'mx-auto max-w-[1180px] px-6';
const EYEBROW = 'text-[.72rem] tracking-[.16em] uppercase font-bold text-brand';
const HEADING = 'font-display leading-[1.05] tracking-[-.02em]';
const BTN =
  'inline-flex items-center gap-2 font-semibold text-[.95rem] px-[1.6rem] py-[.9rem] ' +
  'rounded-full cursor-pointer border border-transparent transition-all hover:-translate-y-0.5';
const BTN_PRIMARY = `${BTN} bg-brand text-brand-foreground hover:bg-brand-ink shadow-[0_10px_26px_-12px] shadow-brand/80`;
const BTN_YELLOW = `${BTN} bg-yellow text-yellow-foreground hover:bg-yellow-hover`;
const BTN_GHOST = `${BTN} bg-transparent text-foreground border-border`;

/* ─── Content ──────────────────────────────────────────── */

const CREDENTIALS = [
  { lg: 'CFP® Professionals', sm: 'Certified Planners' },
  { lg: 'Fiduciary Advice', sm: 'Client-First, Always' },
  { lg: '20+ Years', sm: 'Serving Arizona' },
  { lg: 'Faith & Values', sm: 'Aligned Planning' },
];

const SERVICES = [
  {
    title: 'Financial Planning',
    blurb: 'A proactive plan tailored to your goals and season of life.',
    path: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="3" height="7" />
        <rect x="12" y="6" width="3" height="11" />
        <rect x="17" y="13" width="3" height="4" />
      </>
    ),
  },
  {
    title: 'Investment Management',
    blurb: 'Portfolios aligned to your income needs and long-term objectives.',
    path: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9v9z" />
        <path d="M12 3a9 9 0 0 1 9 9h-9z" />
      </>
    ),
  },
  {
    title: 'Estate Planning',
    blurb: 'Structure your legacy so your wealth supports what matters most.',
    path: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
  },
  {
    title: 'Insurance Planning',
    blurb: "Protect your wealth and family against life's uncertainties.",
    path: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    title: '403(b) Plans',
    blurb: 'Tax-advantaged retirement savings for church and nonprofit teams.',
    path: (
      <>
        <path d="M4 22V6a2 2 0 0 1 2-2h9l5 5v13" />
        <path d="M15 4v5h5" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
  },
];

const PHASES = [
  {
    n: 'I',
    tag: 'Foundation',
    title: 'Protect your today',
    body: 'Establish sound financial principles — stewardship, cash flow, debt elimination, and the protection that safeguards where you are now.',
    color: 'text-phase-1',
    bg: 'bg-phase-1',
  },
  {
    n: 'II',
    tag: 'Accumulation',
    title: 'Build for tomorrow',
    body: 'Grow and manage wealth with disciplined, tax-efficient investing as you build and plan for what’s ahead.',
    color: 'text-phase-2',
    bg: 'bg-phase-2',
  },
  {
    n: 'III',
    tag: 'Strategic Income',
    title: 'Income & legacy',
    body: 'Generate income, preserve wealth, and prepare for retirement, legacy, and generational impact.',
    color: 'text-phase-3',
    bg: 'bg-phase-3',
  },
];

const PLANS = [
  {
    tier: 'Good',
    name: 'Core',
    blurb: 'Foundational planning and professional investment management to get you on track.',
    features: ['Comprehensive financial plan', 'Investment management', 'Annual review & check-ins'],
    featured: false,
  },
  {
    tier: 'Better',
    name: 'Optimized',
    blurb: 'Deeper, proactive planning with tax and estate coordination as life grows more complex.',
    features: [
      'Everything in Core',
      'Tax planning & strategy',
      'Estate & insurance coordination',
      'Priority advisor access',
    ],
    featured: true,
  },
  {
    tier: 'Best',
    name: 'Private Client',
    blurb: 'White-glove, fully coordinated wealth management for complex finances and lasting legacy.',
    features: [
      'Everything in Optimized',
      'Advanced legacy & generational planning',
      'Charitable & impact strategies',
      'Dedicated planning team',
    ],
    featured: false,
  },
];

const FAQS: FaqItem[] = [
  {
    q: 'Who do you work with?',
    a: "We work with individuals and families across every financial background who want a proactive, values-driven plan — whether you're building a foundation or preparing for retirement and legacy.",
  },
  {
    q: 'What does "faith and values aligned" mean?',
    a: 'Our mission is to elevate financial stewardship and empower people to be wise stewards of their money. We help align financial decisions with your values, your family, and a heart of generosity.',
  },
  {
    q: 'How are the tiers different?',
    a: 'Core covers foundational planning and investment management. Optimized adds proactive tax, estate, and insurance coordination. Private Client is fully coordinated wealth management with advanced legacy and impact strategies. Each includes a planning fee and an AUM fee.',
  },
  {
    q: 'How do we get started?',
    a: "Schedule a consultation with a planner. We'll listen to your goals, understand your current situation, and recommend the tier that fits the phase of wealth you're in.",
  },
];

const FOOTER_COLS = [
  {
    h: 'Solutions',
    links: [
      'Financial Planning',
      'Investment Management',
      'Estate Planning',
      'Insurance Planning',
      '403(b) Plans',
    ],
  },
  { h: 'Membership', links: ['Core', 'Optimized', 'Private Client', 'Our Mission'] },
  { h: 'Company', links: ['Our Team', 'Resources', 'Events', 'Contact'] },
];

/* ─── Small building blocks ────────────────────────────── */

function CheckLi({ children, dot }: { children: React.ReactNode; dot: string }) {
  return (
    <li className="flex gap-[.7rem] items-start py-[.4rem] text-[.95rem]">
      <span
        className={cn(
          'flex-none mt-[2px] w-5 h-5 rounded-full grid place-items-center text-white',
          dot,
        )}
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {children}
    </li>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-3 border-b border-black/[.07] dark:border-white/10 last:border-0 text-[.9rem]">
      <span className="text-muted-foreground">{k}</span>
      <b className="font-display">{v}</b>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      <MarketingNav />

      {/* HERO */}
      <section className="text-center pt-[70px] pb-[30px]">
        <div className={WRAP}>
          <h1 className={cn(HEADING, 'text-[clamp(2.6rem,6.4vw,5rem)] font-bold max-w-[14ch] mx-auto')}>
            Financial solutions for every phase of life.
          </h1>
          <p className="text-[clamp(1.05rem,2vw,1.4rem)] max-w-[30ch] mx-auto mt-[1.6rem] mb-8 text-muted-foreground font-medium">
            Get <b className="text-foreground font-semibold">proactive, values-driven advice</b> for
            planning, investing, and legacy — coordinated in one place.
          </p>
          <div className="flex gap-[.8rem] justify-center flex-wrap">
            <a className={BTN_PRIMARY} href="#book">
              Book Your Consultation
            </a>
            <a className={BTN_GHOST} href="#approach">
              See Our Approach
            </a>
          </div>
        </div>
      </section>

      {/* CREDENTIALS */}
      <div className="pt-[34px] pb-[6px]">
        <div className={cn(WRAP, 'flex flex-wrap justify-center gap-x-[30px] gap-y-[14px] items-center')}>
          {CREDENTIALS.map((c) => (
            <div key={c.lg} className="flex flex-col items-center gap-1.5 min-w-[150px] text-center">
              <span className="font-display font-bold text-[1.02rem] text-foreground">{c.lg}</span>
              <span className="text-[.72rem] tracking-[.1em] uppercase text-muted-foreground font-semibold">
                {c.sm}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* YELLOW PRODUCT FRAME */}
      <section className="pt-[34px] pb-5">
        <div className={WRAP}>
          <div className="bg-yellow rounded-[30px] p-[26px]">
            <div className="bg-card rounded-2xl shadow-[0_30px_60px_-40px_rgba(0,0,0,.35)] overflow-hidden">
              <div className="flex items-center gap-4 px-[18px] py-3.5 border-b border-border text-[.85rem] overflow-x-auto">
                <span className="font-display font-bold">SIG</span>
                <span className="px-[.7rem] py-[.28rem] rounded-full bg-yellow-soft text-foreground font-semibold whitespace-nowrap">
                  Roadmap
                </span>
                {['Plan', 'Investments', 'Legacy'].map((t) => (
                  <span key={t} className="px-[.7rem] py-[.28rem] rounded-full text-muted-foreground whitespace-nowrap">
                    {t}
                  </span>
                ))}
                <span className="flex-1" />
                <span className="grid place-items-center w-[26px] h-[26px] rounded-full bg-phase-1 text-white text-[.75rem] font-bold flex-none">
                  D
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.25fr]">
                <div className="px-6 py-[26px] border-b md:border-b-0 md:border-r border-border">
                  <h4 className="font-display text-[1.25rem] font-bold mb-2.5">
                    Hi Dana, here&rsquo;s your plan.
                  </h4>
                  <p className="text-[.86rem] text-muted-foreground mb-2">
                    You&rsquo;re on track through the Foundation phase and building momentum in
                    Accumulation.
                  </p>
                  <p className="text-[.86rem] text-muted-foreground mb-2">
                    Your next step: fund the emergency reserve to 6 months and review your investment
                    mix.
                  </p>
                  <div className="mt-3.5 border border-border rounded-xl px-[.9rem] py-[.7rem] text-[.82rem] text-muted-foreground flex justify-between items-center">
                    Ask your planner anything…
                    <span className="grid place-items-center w-6 h-6 rounded-full bg-brand text-brand-foreground text-[.8rem]">
                      ↑
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {['Are we on track to retire by 62?', 'How much can we give this year?'].map((c) => (
                      <div key={c} className="border border-border rounded-[10px] px-[.7rem] py-2 text-[.8rem] text-foreground">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-[26px]">
                  <span className="text-[.8rem] text-muted-foreground">Plan Progress</span>
                  <div className="font-display text-[1.5rem] font-bold mt-0.5 mb-4">
                    Phase II · <b className="text-phase-1">On Track</b>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { n: 'I', label: 'Foundation', sub: 'Protect today', w: '100%', c: 'bg-phase-1' },
                      { n: 'II', label: 'Accumulation', sub: 'Build tomorrow', w: '64%', c: 'bg-phase-2' },
                      { n: 'III', label: 'Strategic Income', sub: 'Income & legacy', w: '28%', c: 'bg-phase-3' },
                    ].map((r) => (
                      <div key={r.n} className="flex items-center gap-3">
                        <div className={cn('grid place-items-center w-[34px] h-[34px] rounded-[9px] text-white font-display font-bold text-[.85rem] flex-none', r.c)}>
                          {r.n}
                        </div>
                        <div className="text-[.86rem] flex-none w-24">
                          {r.label}
                          <small className="block text-muted-foreground text-[.72rem]">{r.sub}</small>
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <i className={cn('block h-full rounded-full', r.c)} style={{ width: r.w }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[.72rem] text-muted-foreground/70 mt-3.5">
            For illustrative purposes only. Not actual client data, and not legal, tax, or investment
            advice.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="pt-[70px] pb-5" id="solutions">
        <div className={WRAP}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-[22px] lg:gap-[26px]">
            {SERVICES.map((s) => (
              <div key={s.title}>
                <div className="w-[34px] h-[34px] text-brand mb-3">
                  <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {s.path}
                  </svg>
                </div>
                <b className="block font-display text-[1.05rem] font-semibold mb-[5px]">{s.title}</b>
                <span className="text-[.86rem] text-muted-foreground">{s.blurb}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE 1 */}
      <section className="py-11" id="approach">
        <div className={cn(WRAP, 'grid grid-cols-1 lg:grid-cols-2 gap-14 items-center')}>
          <div>
            <span className={EYEBROW}>Investment Strategy</span>
            <h3 className={cn(HEADING, 'text-[clamp(1.6rem,3vw,2.2rem)] font-bold mt-[.6rem]')}>
              Invest with clarity and confidence.
            </h3>
            <p className="text-muted-foreground mt-4">
              Your investments should work in alignment with your larger financial plan. We help you
              think through risk, income needs, tax considerations, and long-term goals so your
              strategy always has clear direction.
            </p>
            <ul className="mt-[1.3rem] p-0 list-none">
              {['Risk and income-need alignment', 'Tax-aware portfolio decisions', 'Strategy tied to your written plan'].map((t) => (
                <CheckLi key={t} dot="bg-brand">
                  {t}
                </CheckLi>
              ))}
            </ul>
          </div>
          <div className="rounded-[22px] p-[30px] min-h-[280px] flex flex-col justify-center border border-border bg-gradient-to-b from-brand/10 to-brand/[.03]">
            <div className="font-display text-[2.4rem] font-bold text-brand">Aligned</div>
            <Kv k="Plan direction" v="Goal-based" />
            <Kv k="Income needs" v="Mapped" />
            <Kv k="Tax posture" v="Optimized" />
          </div>
        </div>
      </section>

      {/* FEATURE 2 — reversed */}
      <section className="py-11">
        <div className={cn(WRAP, 'grid grid-cols-1 lg:grid-cols-2 gap-14 items-center')}>
          <div className="lg:order-2">
            <span className={EYEBROW}>Legacy Planning</span>
            <h3 className={cn(HEADING, 'text-[clamp(1.6rem,3vw,2.2rem)] font-bold mt-[.6rem]')}>
              Give with purpose and impact.
            </h3>
            <p className="text-muted-foreground mt-4">
              Financial planning is about more than accumulation. We help you think through
              generosity, family impact, and charitable giving so your resources can support your
              values, your faith, and the legacy you want to leave.
            </p>
            <ul className="mt-[1.3rem] p-0 list-none">
              {['Charitable and generosity strategies', 'Family and generational impact', 'Values-aligned legacy planning'].map((t) => (
                <CheckLi key={t} dot="bg-brand">
                  {t}
                </CheckLi>
              ))}
            </ul>
          </div>
          <div className="lg:order-1 rounded-[22px] p-[30px] min-h-[280px] flex flex-col justify-center border border-border bg-gradient-to-b from-yellow/25 to-yellow/[.06]">
            <div className="font-display text-[2.4rem] font-bold text-[#B78900] dark:text-yellow">
              Legacy
            </div>
            <Kv k="Generosity plan" v="Intentional" />
            <Kv k="Family impact" v="Multi-gen" />
            <Kv k="Charitable giving" v="Tax-smart" />
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-20 bg-secondary border-y border-border">
        <div className={WRAP}>
          <span className={EYEBROW}>The Three Phases of Wealth</span>
          <h2 className={cn(HEADING, 'text-[clamp(1.9rem,3.8vw,2.8rem)] font-bold mt-[.6rem]')}>
            A clear path, whatever season you&rsquo;re in.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-11">
            {PHASES.map((p) => (
              <div key={p.n} className="bg-card border border-border rounded-[18px] p-[26px]">
                <div className={cn('font-display text-[2rem] font-bold leading-none', p.color)}>
                  {p.n}
                </div>
                <span
                  className={cn(
                    'inline-block text-[.68rem] tracking-[.12em] uppercase font-bold text-white px-[.55rem] py-[.2rem] rounded-full mt-2.5',
                    p.bg,
                  )}
                >
                  {p.tag}
                </span>
                <b className="block font-display text-[1.15rem] font-semibold mt-[.6rem] mb-2">
                  {p.title}
                </b>
                <p className="text-muted-foreground text-[.92rem] m-0">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-[84px]" id="pricing">
        <div className={WRAP}>
          <div className="text-center max-w-[52ch] mx-auto">
            <span className={EYEBROW}>Membership</span>
            <h2 className={cn(HEADING, 'text-[clamp(1.9rem,3.8vw,2.8rem)] font-bold mt-[.6rem]')}>
              Three ways to work with us.
            </h2>
            <p className="text-muted-foreground mt-[.9rem]">
              Every relationship includes a planning fee and an assets-under-management (AUM) fee.
              Choose the level of depth that fits where you are.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-11 items-stretch">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn(
                  'bg-card border rounded-[22px] p-[30px] flex flex-col relative transition-all duration-200',
                  p.featured
                    ? 'border-2 border-brand shadow-[0_30px_60px_-34px] shadow-brand/45 md:-translate-y-2 hover:md:-translate-y-3'
                    : 'border-border hover:-translate-y-1 hover:shadow-[0_24px_50px_-34px_rgba(0,0,0,.25)]',
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow text-yellow-foreground text-[.68rem] font-bold tracking-[.1em] uppercase px-[.9rem] py-[.35rem] rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <span className="text-[.72rem] tracking-[.16em] uppercase font-bold text-muted-foreground">
                  {p.tier}
                </span>
                <h3 className={cn(HEADING, 'text-[1.5rem] font-bold mt-[.35rem] mb-[.2rem]')}>
                  {p.name}
                </h3>
                <p className="text-[.9rem] text-muted-foreground min-h-[46px]">{p.blurb}</p>

                <div className="my-5 border-y border-dashed border-border py-4">
                  <div className="flex justify-between items-baseline py-[.35rem] text-[.92rem]">
                    <span className="text-muted-foreground">Planning Fee</span>
                    <span className="font-display font-semibold">[ set fee ]</span>
                  </div>
                  <div className="flex justify-between items-baseline py-[.35rem] text-[.92rem]">
                    <span className="text-muted-foreground">AUM Fee</span>
                    <span className="font-display font-semibold">[ set % ]</span>
                  </div>
                </div>

                <ul className="list-none m-0 mb-6 p-0 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-[.6rem] py-[.4rem] text-[.9rem]">
                      <span className="flex-none mt-[1px] w-[18px] h-[18px] rounded-full bg-phase-1 grid place-items-center text-white">
                        <svg viewBox="0 0 24 24" className="w-[11px] h-[11px]" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a className={cn(p.featured ? BTN_PRIMARY : BTN_GHOST, 'justify-center w-full')} href="#book">
                  Get Started
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-[.78rem] text-muted-foreground/70 mt-[22px]">
            Fee figures shown are placeholders — replace with your published Planning Fee and AUM Fee
            for each tier.
          </p>
        </div>
      </section>

      {/* IMPACT */}
      <section className="pt-[60px] pb-20" id="impact">
        <div className={WRAP}>
          <div className="rounded-[26px] p-8 md:p-[52px] text-center bg-yellow text-yellow-foreground">
            <span className="text-[.72rem] tracking-[.16em] uppercase font-bold text-brand-ink dark:text-[#1E3EB0]">
              Our Impact Goal
            </span>
            <h2 className={cn(HEADING, 'text-[clamp(1.7rem,3.4vw,2.4rem)] font-bold max-w-[24ch] mx-auto mt-[.6rem]')}>
              Inspire 25,000 people to transform their communities through generosity.
            </h2>
            <div className="font-display text-[clamp(2.6rem,6vw,4rem)] font-extrabold mt-4">
              $1 Billion+
            </div>
            <small className="text-[#7A6B12]">
              In charitable contributions and impact investments — the difference we&rsquo;re working
              toward, together.
            </small>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pt-5 pb-[90px]" id="faq">
        <div className={cn(WRAP, 'grid grid-cols-1 lg:grid-cols-[.8fr_1.2fr] gap-12 items-start')}>
          <div className="max-w-[60ch]">
            <span className={EYEBROW}>Good to Know</span>
            <h2 className={cn(HEADING, 'text-[2rem] font-bold mt-[.6rem]')}>
              Frequently asked questions.
            </h2>
            <p className="text-muted-foreground mt-[.9rem]">
              Still have questions? Call{' '}
              <a href="tel:+14804667070" className="text-brand font-semibold">
                (480) 466-7070
              </a>{' '}
              to talk with a planner.
            </p>
          </div>
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="pt-5 pb-20" id="book">
        <div className={WRAP}>
          <div className="rounded-[26px] px-8 py-14 md:px-12 bg-brand text-brand-foreground flex justify-between items-center gap-8 flex-wrap">
            <div>
              <h2 className={cn(HEADING, 'text-[clamp(1.7rem,3.4vw,2.4rem)] font-bold max-w-[20ch]')}>
                Let&rsquo;s build a plan with purpose.
              </h2>
              <p className="text-brand-foreground/85 mt-[.6rem]">
                Meet with a Certified Financial Planner or Wealth Advisor — scheduling takes just a
                couple of clicks.
              </p>
            </div>
            <div className="flex gap-[.7rem] flex-wrap">
              <a className={BTN_YELLOW} href="#">
                Schedule Online
              </a>
              <a
                className={cn(BTN, 'bg-transparent text-brand-foreground border-brand-foreground/40')}
                href="tel:+14804667070"
              >
                (480) 466-7070
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-secondary text-muted-foreground pt-14 pb-7 text-[.9rem] border-t border-border">
        <div className={WRAP}>
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
            <div>
              <div className="font-display font-bold text-[1.15rem] text-foreground mb-2">SIG360</div>
              <p className="max-w-[34ch] mt-[.4rem] mb-4">
                Comprehensive financial planning for every phase of life. Empowering individuals to
                live their best lives and leave a lasting legacy.
              </p>
              <p>
                2330 W Ray Rd. #3, Chandler, AZ 85224
                <br />
                <a href="tel:+14804667070" className="inline hover:text-brand transition-colors">
                  (480) 466-7070
                </a>{' '}
                ·{' '}
                <a
                  href="mailto:planning@strategicincomegroup.com"
                  className="inline hover:text-brand transition-colors"
                >
                  planning@strategicincomegroup.com
                </a>
              </p>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.h}>
                <h4 className="font-display text-foreground text-base font-semibold mb-3.5">
                  {col.h}
                </h4>
                {col.links.map((l) => (
                  <a key={l} href="#" className="block py-[.28rem] hover:text-brand transition-colors">
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-10 pt-[22px] flex justify-between gap-4 flex-wrap text-[.8rem]">
            <span>© 2026 Strategic Income Group LLC. All rights reserved.</span>
            <span>Privacy Policy · Form ADV · Terms of Service · CRS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
