import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mark } from '../../components/Brand';
import type { MuscleGroup } from '../../api/types';
import { fmtNum, MUSCLE_LABELS } from '../../utils/format';
import { BODY_GROUPS, MUSCLE_PARTS, musclePart } from '../../utils/muscles';
import AnatomyFigure, { type MuscleState } from './AnatomyFigure';
import './landing.css';

// Every number below is sample data, labelled as such on the page. Est. 1RM uses the API's formula: w × (1 + reps / 30).

const SESSION = [
  { name: 'Squat', sets: 4, reps: 6, kg: 100, pr: true },
  { name: 'Romanian Deadlift', sets: 3, reps: 8, kg: 80 },
  { name: 'Leg Press', sets: 3, reps: 12, kg: 160 },
  { name: 'Leg Curl', sets: 3, reps: 12, kg: 45 },
];
const sessionVolume = SESSION.reduce((s, e) => s + e.sets * e.reps * e.kg, 0);

const MONTH = [
  { day: 14, wd: 'Ç', title: 'Ayaq günü', sub: 'Squat, Romanian Deadlift, Leg Press, Leg Curl', vol: sessionVolume },
  { day: 12, wd: 'B.e', title: 'Push', sub: 'Bench Press, Overhead Press, Triceps Pushdown', vol: 8340 },
  { day: 10, wd: 'Ş', title: 'Pull', sub: 'Deadlift, Pull-up, Barbell Row, Barbell Curl', vol: 9120 },
  { day: 8, wd: 'C.a', title: 'Kardio', sub: 'Treadmill · 30 dəq', vol: null },
];

type DayStatus = 'done' | 'missed' | 'today' | 'upcoming';
const STATUS_LABEL: Record<DayStatus, string> = {
  done: 'Tamamlandı',
  missed: 'Buraxıldı',
  today: 'Bu gün',
  upcoming: 'Gələcək',
};
const WEEK: { d: string; work?: string; list?: string; status?: DayStatus }[] = [
  { d: 'B.e', work: 'Push', list: 'Bench · OHP · Dips', status: 'done' },
  { d: 'Ç.a', work: 'Pull', list: 'Deadlift · Row · Curl', status: 'done' },
  { d: 'Ç' },
  { d: 'C.a', work: 'Legs', list: 'Squat · RDL · Leg Press', status: 'missed' },
  { d: 'C', work: 'Push', list: 'Bench · OHP · Incline', status: 'today' },
  { d: 'Ş', work: 'Pull', list: 'Pull-up · Row · Face Pull', status: 'upcoming' },
  { d: 'B' },
];
const TODAY_PLAN = [
  { name: 'Bench Press', plan: '4 × 8', kg: '80 kg' },
  { name: 'Overhead Press', plan: '3 × 8', kg: '50 kg' },
  { name: 'Incline Dumbbell Press', plan: '3 × 10', kg: '26 kg' },
  { name: 'Triceps Pushdown', plan: '3 × 12', kg: '30 kg' },
];

const VOLUME_12W = [6200, 7050, 6800, 7900, 8350, 4100, 8100, 9000, 9650, 9200, 10400, 11700];
const RECORDS = [
  { name: 'Deadlift', est: 151.7 },
  { name: 'Squat', est: 120.0 },
  { name: 'Bench Press', est: 101.3 },
  { name: 'Barbell Row', est: 88.7 },
  { name: 'Overhead Press', est: 63.3 },
  { name: 'Barbell Curl', est: 48.0 },
];
const GROUP_SETS: Partial<Record<MuscleGroup, number>> = { legs: 42, back: 38, chest: 30, arms: 26, shoulders: 22, core: 12 };

/** 11700 → "11 700" (thin space, same in every browser). */
const kg = (n: number) => fmtNum(n);

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 9h13M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Logo() {
  return (
    <Link to="/" className="lp-logo" aria-label="Fitness Coach — ana səhifə">
      <Mark className="lp-logo__mark" />
      {/* lang="en" keeps the uppercase "I" dotless on an az page. */}
      <span lang="en">Fitness Coach</span>
    </Link>
  );
}

function VolumeChart() {
  const W = 600;
  const H = 150;
  const AXIS = 34; // left gutter for the y labels
  const max = 12000;
  const step = (W - AXIS) / VOLUME_12W.length;
  const bw = step * 0.62;
  return (
    <svg viewBox={`0 0 ${W} ${H + 2}`} role="img" aria-label="12 həftəlik həcm qrafiki, nümunə">
      {[4000, 8000, 12000].map((v) => {
        const y = H - (v / max) * H;
        return (
          <g key={v}>
            <line x1={AXIS} x2={W} y1={y} y2={y} stroke="#d5cfc1" strokeDasharray="2 4" />
            <text x={0} y={y + 4} fontSize="12" fontFamily="IBM Plex Mono, monospace" fill="#6c685e">
              {v / 1000}t
            </text>
          </g>
        );
      })}
      <line x1={AXIS} x2={W} y1={H} y2={H} stroke="#17160f" strokeWidth="1.5" />
      {VOLUME_12W.map((v, i) => {
        const h = (v / max) * H;
        const last = i === VOLUME_12W.length - 1;
        return (
          <rect
            key={i}
            x={AXIS + i * step + (step - bw) / 2}
            y={H - h}
            width={bw}
            height={h}
            fill={last ? '#e5432b' : '#17160f'}
            opacity={last ? 1 : 0.82}
          />
        );
      })}
    </svg>
  );
}

function MuscleMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  const part = musclePart(hovered ?? selected);
  const activeGroup = part?.group ?? group;
  const stateOf = (id: string): MuscleState =>
    id === part?.id ? 'hot' : activeGroup && musclePart(id)?.group === activeGroup ? 'group' : 'idle';

  const pickGroup = (g: MuscleGroup) => {
    setSelected(null);
    setGroup((cur) => (cur === g ? null : g));
  };

  return (
    <div className="lp-map">
      <div>
        <AnatomyFigure
          stateOf={stateOf}
          onHover={setHovered}
          onPick={(id) => {
            setGroup(null);
            setSelected((cur) => (cur === id ? null : id));
          }}
        />
        <div className="lp-map__view lp-label" aria-hidden="true">
          <span>Ön</span>
          <span>Arxa</span>
        </div>
      </div>

      <div>
        <div className="lp-map__readout" aria-live="polite">
          {part ? (
            <>
              <span className="lp-label" style={{ color: '#ff8a73' }}>
                {MUSCLE_LABELS[part.group]}
              </span>
              <p className="lp-map__name">{part.name}</p>
              <span className="lp-map__latin">{part.latin}</span>
            </>
          ) : activeGroup ? (
            <>
              <span className="lp-label" style={{ color: '#ff8a73' }}>
                Qrup
              </span>
              <p className="lp-map__name">{MUSCLE_LABELS[activeGroup]}</p>
              <span className="lp-map__latin">
                {MUSCLE_PARTS.filter((p) => p.group === activeGroup).length} əzələ
              </span>
            </>
          ) : (
            <p className="lp-map__hint">Əzələnin üzərinə gətirin və ya toxunun. Qrupu siyahıdan da seçə bilərsiniz.</p>
          )}
        </div>
        <ul className="lp-groups">
          {BODY_GROUPS.map((g) => (
            <li key={g}>
              <button
                type="button"
                aria-pressed={activeGroup === g}
                onClick={() => pickGroup(g)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setGroup(g)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setGroup(null)}
              >
                <b>
                  {MUSCLE_LABELS[g]}
                  <small>{MUSCLE_PARTS.filter((p) => p.group === g).length}</small>
                </b>
                <span>
                  {MUSCLE_PARTS.filter((p) => p.group === g)
                    .map((p) => p.name)
                    .join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Fitness Coach — məşq jurnalı, proqramlar və irəliləyiş';
    return () => {
      document.title = prev;
    };
  }, []);

  const maxSets = Math.max(...Object.values(GROUP_SETS));

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-header__row">
          <Logo />
          <nav className="lp-nav" aria-label="Bölmələr">
            <a href="#jurnal">Jurnal</a>
            <a href="#proqramlar">Proqramlar</a>
            <a href="#xerite">Əzələ xəritəsi</a>
            <a href="#irelileyis">İrəliləyiş</a>
          </nav>
          <div className="lp-header__auth">
            <Link to="/login" className="lp-header__login">
              Daxil ol
            </Link>
            <Link to="/register" className="lp-btn lp-btn--solid lp-btn--sm">
              Qeydiyyat
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero__grid">
            <div>
              <p className="lp-kicker lp-label">
                <span>Məşq jurnalı</span>
                <span>Proqramlar</span>
                <span>İrəliləyiş</span>
              </p>
              <h1 className="lp-h1">
                Hər set
                <br />
                <em>sayılır.</em>
              </h1>
              <p className="lp-hero__lead">
                Fitness Coach idman zalındakı məşqlərinizi qeyd etmək, proqram qurmaq və nəticələrin həftədən-həftəyə
                necə dəyişdiyini görmək üçündür.
              </p>
              <div className="lp-hero__cta">
                <Link to="/register" className="lp-btn lp-btn--solid">
                  Hesab yaradın <Arrow />
                </Link>
                <Link to="/login" className="lp-textlink">
                  Artıq hesabım var
                </Link>
              </div>
              <p className="lp-hero__note">Qeydiyyat üçün ad, email və şifrə kifayətdir.</p>
            </div>

            <article className="lp-sheet" aria-label="Nümunə məşq qeydi">
              <header className="lp-sheet__head">
                <div>
                  <h2 className="lp-sheet__title">Ayaq günü</h2>
                  <p className="lp-sheet__meta">Çərşənbə, 14 Oktyabr · Push / Pull / Legs, 2-ci həftə</p>
                </div>
                <span className="lp-sample lp-label">Nümunə</span>
              </header>
              <table className="lp-log">
                <thead>
                  <tr>
                    <th>Hərəkət</th>
                    <th className="num">Set × təkrar</th>
                    <th className="num">Çəki</th>
                    <th className="num hide-sm">Həcm</th>
                  </tr>
                </thead>
                <tbody>
                  {SESSION.map((e) => (
                    <tr key={e.name}>
                      <td>
                        <div className="lp-log__ex">{e.name}</div>
                        {e.pr && <span className="lp-pr">Yeni rekord</span>}
                      </td>
                      <td className="num">
                        {e.sets} × {e.reps}
                      </td>
                      <td className="num">{e.kg} kg</td>
                      <td className="num hide-sm">{kg(e.sets * e.reps * e.kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="lp-sheet__foot">
                <div>
                  <dt>Həcm</dt>
                  <dd>{kg(sessionVolume)} kg</dd>
                </div>
                <div>
                  <dt>Squat 1RM ≈</dt>
                  <dd>120 kg</dd>
                </div>
                <div>
                  <dt>Seriya</dt>
                  <dd>7 həftə</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <div className="lp-strip" aria-label="Nə izlənir">
          <div className="lp-wrap lp-strip__row lp-label">
            <span>Set</span>
            <span>Təkrar</span>
            <span>Çəki</span>
            <span>Həcm</span>
            <span>Təxmini 1RM</span>
            <span>Həftə seriyası</span>
            <span>Bədən çəkisi</span>
            <span>Yağ faizi</span>
            <span>BMI</span>
          </div>
        </div>

        <section className="lp-section" id="jurnal">
          <div className="lp-wrap lp-feature">
            <div className="lp-feature__text">
              <p className="lp-index lp-label">01 · Jurnal</p>
              <h2 className="lp-h2">Siz yazın, hesablamanı tətbiq etsin.</h2>
              <p className="lp-feature__body">
                Hər hərəkət üçün set, təkrar və çəkini qeyd edin. Ümumi həcm, təxmini 1RM və şəxsi rekordlar avtomatik
                hesablanır, məşqlər isə aylar üzrə qruplaşır.
              </p>
              <ul className="lp-points">
                <li>Hazır kataloqda 26 hərəkət var, çatmayanı özünüz əlavə edirsiniz</li>
                <li>Hər hərəkətin ayrıca irəliləyiş qrafiki var</li>
                <li>Keçmiş məşqi istənilən vaxt düzəltmək olar</li>
              </ul>
            </div>

            <article className="lp-sheet" aria-label="Nümunə: aylıq məşq siyahısı">
              <header className="lp-sheet__head">
                <div>
                  <h3 className="lp-sheet__title">Məşqlər</h3>
                  <p className="lp-sheet__meta">Bu ay 14 məşq · {kg(118400)} kg</p>
                </div>
                <span className="lp-sample lp-label">Nümunə</span>
              </header>
              <div className="lp-month">
                <div className="lp-month__label lp-label">Oktyabr 2026</div>
                {MONTH.map((w) => (
                  <div className="lp-wk" key={w.day}>
                    <div className="lp-wk__date">
                      <b>{w.day}</b>
                      {w.wd}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="lp-wk__title">{w.title}</div>
                      <div className="lp-wk__sub">{w.sub}</div>
                    </div>
                    <div className="lp-wk__vol">{w.vol ? `${kg(w.vol)} kg` : '—'}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="lp-section" id="proqramlar">
          <div className="lp-wrap lp-feature lp-feature--flip">
            <article className="lp-sheet" aria-label="Nümunə: həftəlik proqram">
              <header className="lp-sheet__head">
                <div>
                  <h3 className="lp-sheet__title">Push / Pull / Legs</h3>
                  <p className="lp-sheet__meta">Həftəlik proqram · aktiv</p>
                </div>
                <span className="lp-sample lp-label">Nümunə</span>
              </header>
              <div className="lp-week">
                {WEEK.map((day) => (
                  <div
                    key={day.d}
                    className={`lp-day${day.status ? ` lp-day--s-${day.status}` : ''}${day.status === 'today' ? ' lp-day--today' : ''}${day.work ? '' : ' lp-day--rest'}`}
                  >
                    <span className="lp-day__name lp-label">{day.d}</span>
                    <span className="lp-day__work">{day.work ?? 'İstirahət'}</span>
                    {day.list && (
                      <span className="lp-day__list">
                        {day.list.split(' · ').map((x) => (
                          <span key={x}>{x}</span>
                        ))}
                      </span>
                    )}
                    {day.status ? (
                      <span className={`lp-status lp-status--${day.status}`}>{STATUS_LABEL[day.status]}</span>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
              <div className="lp-plan-head">
                <b>Bu günün planı</b>
                <span className="lp-label" style={{ color: 'var(--muted)' }}>
                  4 hərəkət · 13 set
                </span>
              </div>
              {TODAY_PLAN.map((r) => (
                <div className="lp-plan-row" key={r.name}>
                  <span>{r.name}</span>
                  <span className="num">{r.plan}</span>
                  <span className="num">{r.kg}</span>
                </div>
              ))}
            </article>

            <div className="lp-feature__text">
              <p className="lp-index lp-label">02 · Proqramlar</p>
              <h2 className="lp-h2">Plan qurun, hər günün statusunu görün.</h2>
              <p className="lp-feature__body">
                Həftəlik (7 gün) və ya aylıq (4 həftə) proqram yaradın: hər gün üçün hərəkətlər, set × təkrar və hədəf
                çəki. Təqvimdə hansı günün tamamlandığı, hansının buraxıldığı dərhal görünür.
              </p>
              <ul className="lp-points">
                <li>“Qeyd et” günün planını məşq formasına köçürür, siz yalnız faktiki rəqəmləri düzəldirsiniz</li>
                <li>Yazılan məşq avtomatik həmin proqram gününə bağlanır</li>
                <li>Bir neçə proqram saxlayıb istədiyinizi aktiv edə bilərsiniz</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-section lp-dark" id="xerite">
          <div className="lp-wrap lp-feature lp-feature--map">
            <div className="lp-feature__text">
              <p className="lp-index lp-label">03 · Əzələ xəritəsi</p>
              <h2 className="lp-h2">Hansı əzələni işlətdiyinizi görün.</h2>
              <p className="lp-feature__body">
                16 əzələ, 6 qrup. Tətbiqdə əzələyə klikləmək həmin əzələ üçün hərəkətləri açır, son 30 günün setləri isə
                qruplar üzrə sayılır, beləcə geridə qalan qrup dərhal görünür.
              </p>
              <ul className="lp-points">
                <li>Tətbiqin içində xəritə 3D modeldir, istənilən bucağa fırlanır</li>
                <li>Hər əzələnin Azərbaycan və latın adı göstərilir</li>
              </ul>
              <p className="lp-map__credit">3D anatomik model: BodyParts3D, CC BY 4.0</p>
            </div>
            <MuscleMap />
          </div>
        </section>

        <section className="lp-section" id="irelileyis">
          <div className="lp-wrap lp-feature lp-feature--flip">
            <article className="lp-sheet" aria-label="Nümunə: əsas səhifə göstəriciləri">
              <header className="lp-sheet__head">
                <div>
                  <h3 className="lp-sheet__title">Əsas səhifə</h3>
                  <p className="lp-sheet__meta">Son 12 həftə</p>
                </div>
                <span className="lp-sample lp-label">Nümunə</span>
              </header>
              <dl className="lp-stats">
                <div className="lp-stat">
                  <dt className="lp-label">Bu ay</dt>
                  <dd>
                    14<small>məşq</small>
                  </dd>
                </div>
                <div className="lp-stat">
                  <dt className="lp-label">Seriya</dt>
                  <dd>
                    7<small>həftə</small>
                  </dd>
                </div>
                <div className="lp-stat">
                  <dt className="lp-label">Çəki</dt>
                  <dd>
                    79,8<small>kg</small>
                  </dd>
                </div>
              </dl>
              <div className="lp-chart">
                <div className="lp-chart__label lp-label">
                  <span>Həftəlik həcm</span>
                  <span>kg</span>
                </div>
                <VolumeChart />
                <div className="lp-chart__label lp-label" style={{ margin: '8px 0 0' }}>
                  <span>12 həftə əvvəl</span>
                  <span style={{ color: 'var(--red-ink)', fontWeight: 600 }}>
                    Bu həftə · {kg(VOLUME_12W[VOLUME_12W.length - 1])} kg
                  </span>
                </div>
              </div>
              <div className="lp-records">
                <div>
                  <span className="lp-label" style={{ color: 'var(--muted)' }}>
                    Rekordlar · təxmini 1RM
                  </span>
                  <ol>
                    {RECORDS.map((r) => (
                      <li key={r.name}>
                        <span>{r.name}</span>
                        <span>{fmtNum(r.est, 1)} kg</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <span className="lp-label" style={{ color: 'var(--muted)' }}>
                    Setlər · 30 gün
                  </span>
                  <ol>
                    {(Object.entries(GROUP_SETS) as [MuscleGroup, number][]).map(([g, n]) => (
                      <li key={g} style={{ alignItems: 'center' }}>
                        <span style={{ flex: '0 0 92px' }}>{MUSCLE_LABELS[g].replace(' (core)', '')}</span>
                        <span
                          aria-hidden="true"
                          style={{ flex: 1, height: 6, background: '#e8e3d8', position: 'relative' }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: `${(n / maxSets) * 100}%`,
                              background: g === 'core' ? '#e5432b' : '#17160f',
                            }}
                          />
                        </span>
                        <span style={{ flex: '0 0 28px', textAlign: 'right' }}>{n}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>

            <div className="lp-feature__text">
              <p className="lp-index lp-label">04 · İrəliləyiş</p>
              <h2 className="lp-h2">Rəqəmlər həftə-həftə.</h2>
              <p className="lp-feature__body">
                Əsas səhifədə həftəlik və aylıq məşq sayı, ardıcıl həftə seriyası, 12 həftəlik həcm qrafiki və təxmini
                1RM üzrə rekordlar toplanır. Zaldan bir həftə uzaq qalsanız, qrafikdə bunu dərhal görəcəksiniz.
              </p>
              <ul className="lp-points">
                <li>Bədən ölçüləri: çəki, yağ faizi və BMI</li>
                <li>Hədəf çəkini qoyun, nə qədər qaldığını izləyin</li>
                <li>İşıqlı və qaranlıq tema</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-section" id="baslamaq">
          <div className="lp-wrap">
            <div className="lp-steps__head">
              <h2 className="lp-h2">Başlamaq üçün üç addım</h2>
              <Link to="/register" className="lp-btn lp-btn--line">
                Hesab yaradın <Arrow />
              </Link>
            </div>
            <ol className="lp-steps">
              <li>
                <span className="lp-steps__n">1</span>
                <h3>Hesab açın</h3>
                <p>Ad, email və şifrə. Başqa heç nə soruşulmur.</p>
              </li>
              <li>
                <span className="lp-steps__n">2</span>
                <h3>Proqram qurun, ya da qurmayın</h3>
                <p>
                  Planınız varsa, onu həftəlik və ya aylıq proqrama çevirin. Yoxdursa, sadəcə məşqləri yazmağa başlayın.
                </p>
              </li>
              <li>
                <span className="lp-steps__n">3</span>
                <h3>Hər məşqdən sonra yazın</h3>
                <p>Bir neçə həftədən sonra qrafiklər, rekordlar və seriya öz-özünə formalaşacaq.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap lp-final__grid">
            <div>
              <h2>
                Növbəti məşqdən
                <br />
                başlayın.
              </h2>
              <p>
                Telefonda da rahatdır: sayt mobil brauzerə uyğunlaşır, Android tətbiqi isə eyni hesabla işləyir.
              </p>
            </div>
            <div className="lp-final__cta">
              <Link to="/register" className="lp-btn lp-btn--solid">
                Qeydiyyatdan keçin <Arrow />
              </Link>
              <Link to="/login" className="lp-textlink">
                Hesabınız var? Daxil olun
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer__row">
          <Logo />
          <nav aria-label="Hesab">
            <Link to="/login">Daxil ol</Link>
            <Link to="/register">Qeydiyyat</Link>
          </nav>
          <span>© {new Date().getFullYear()} Fitness Coach</span>
        </div>
      </footer>
    </div>
  );
}
