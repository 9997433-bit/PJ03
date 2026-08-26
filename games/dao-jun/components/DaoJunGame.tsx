'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ACTIONS,
  ANTI_CHEAT_LAYERS,
  COMBAT_TACTICS,
  CREATION_STEPS,
  EVENTS,
  INVENTORY_LIMIT,
  ITEMS,
  MAX_COMBAT_ROUNDS,
  ORIGINS,
  PATH_INFO,
  REALMS,
  SAVE_KEY,
  VOWS,
  actionAvailability,
  advanceCreation,
  buildAuditTable,
  buyItem,
  buyPrice,
  canAdvanceCreation,
  canBuy,
  canSell,
  chooseEvent,
  clearSave,
  createCreationState,
  createGame,
  fightRound,
  getBrowserStorage,
  getEnding,
  getFoe,
  loadGame,
  marketStock,
  performAction,
  resolveMilestone,
  retreatCreation,
  saveGame,
  selectCreationOrigin,
  selectCreationPath,
  selectCreationVow,
  sellItem,
  sellPrice,
  setCreationName,
  tacticAvailability,
  totalPower,
  useItem,
  verifyStateChain,
  type CombatTactic,
  type CoreAction,
  type CreationOptions,
  type DaoPath,
  type GameState,
  type OriginId,
  type StorageAdapter,
  type VowId,
} from '@/engine';

export { SAVE_KEY };

const ACTION_META: Record<CoreAction, { seal: string; subtitle: string; cost: string }> = {
  悟道: { seal: '悟', subtitle: '观天地而得纹意', cost: '神魂 -6' },
  凝纹: { seal: '纹', subtitle: '将感悟刻入道基', cost: '神魂 -8' },
  斗法: { seal: '战', subtitle: '以术争名夺资源', cost: '灵气 -8' },
  占地: { seal: '疆', subtitle: '破阵立碑拓灵域', cost: '粮草 10 · 灵气 10' },
  突破: { seal: '劫', subtitle: '渡雷劫叩问天门', cost: '道纹与神魂' },
  调息: { seal: '息', subtitle: '收功静坐，回气养神', cost: '仅耗一回' },
};

const TACTIC_META: Record<CombatTactic, { seal: string; subtitle: string }> = {
  力破: { seal: '破', subtitle: '倾力破敌，门户随之大开' },
  周旋: { seal: '旋', subtitle: '游走试探，伤敌浅而自保深' },
  布纹: { seal: '纹', subtitle: '铺纹蓄势，下一记力破威力倍增' },
  摄神: { seal: '摄', subtitle: '神念夺魄，无视护体外甲' },
  吞丹: { seal: '丹', subtitle: '仰头吞丹，敌手趁隙一击' },
  遁土: { seal: '遁', subtitle: '敛去气机，遁土而走' },
};

function Meter({ value, max, tone = 'blue' }: { value: number; max: number; tone?: 'blue' | 'cyan' | 'violet' | 'gold' }) {
  const percentage = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className={`meter meter-${tone}`} aria-label={`${value} / ${max}`}>
      <span style={{ '--meter': `${percentage}%` } as CSSProperties} />
    </div>
  );
}

function Creation({ onComplete }: { onComplete: (options: CreationOptions) => void }) {
  const [creation, setCreation] = useState(createCreationState);
  const { step, draft } = creation;
  const next = () => {
    const transition = advanceCreation(creation);
    if (!transition.ok) return;
    if (transition.options) onComplete(transition.options);
    else setCreation(transition.state);
  };

  return (
    <main className="creation-shell">
      <div className="storm-glow" />
      <div className="thunder-pattern" aria-hidden="true" />
      <section className="creation-card">
        <div className="title-sigil" aria-hidden="true">道</div>
        <p className="eyebrow">DAO PATTERN · LIFE SIMULATOR</p>
        <h1>道君<span>人生模拟器</span></h1>
        <p className="intro">雷落山门，道纹初醒。你的一念，将成为此世疆界。</p>

        <ol className="stepper" aria-label="角色创建进度">
          {CREATION_STEPS.map((label, index) => (
            <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''} aria-current={index === step ? 'step' : undefined}>
              <b>{index < step ? '✓' : index + 1}</b><span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="creation-body">
          {step === 0 && (
            <div className="creation-step">
              <p className="step-kicker">第一问 · 名号</p>
              <h2>世间如何称你？</h2>
              <label className="name-field">
                <span>道号 / 姓名</span>
                <input
                  autoFocus
                  maxLength={8}
                  value={draft.name}
                  placeholder="例如：宁玄"
                  onChange={(event) => setCreation(setCreationName(creation, event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canAdvanceCreation(creation)) next();
                  }}
                />
              </label>
              <blockquote>“名可寄于世，道须证于心。”</blockquote>
            </div>
          )}

          {step === 1 && (
            <div className="creation-step">
              <p className="step-kicker">第二问 · 来处</p>
              <h2>哪段尘缘将你送上道途？</h2>
              <div className="option-grid">
                {(Object.entries(ORIGINS) as [OriginId, (typeof ORIGINS)[OriginId]][]).map(([id, origin]) => (
                  <button type="button" key={id} aria-pressed={draft.origin === id} className={`choice-card ${draft.origin === id ? 'selected' : ''}`} onClick={() => setCreation(selectCreationOrigin(creation, id))}>
                    <b>{origin.name}</b><span>{origin.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="creation-step">
              <p className="step-kicker">第三问 · 道途</p>
              <h2>四途分野，只可择一而行</h2>
              <div className="path-grid">
                {(Object.entries(PATH_INFO) as [DaoPath, (typeof PATH_INFO)[DaoPath]][]).map(([id, path]) => (
                  <button type="button" key={id} aria-pressed={draft.path === id} className={`path-card ${draft.path === id ? 'selected' : ''}`} onClick={() => setCreation(selectCreationPath(creation, id))}>
                    <i>{path.glyph}</i><b>{path.title}</b><span>{path.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="creation-step">
              <p className="step-kicker">第四问 · 道心</p>
              <h2>若天地相问，你以何念作答？</h2>
              <p className="creation-summary">{draft.name} · {draft.origin ? ORIGINS[draft.origin].name : ''} · {draft.path ? PATH_INFO[draft.path].title : ''}</p>
              <div className="option-grid">
                {(Object.entries(VOWS) as [VowId, (typeof VOWS)[VowId]][]).map(([id, vow]) => (
                  <button type="button" key={id} aria-pressed={draft.vow === id} className={`choice-card ${draft.vow === id ? 'selected' : ''}`} onClick={() => setCreation(selectCreationVow(creation, id))}>
                    <b>{vow.name}</b><span>{vow.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="creation-actions">
          <button type="button" className="button-ghost" disabled={step === 0} onClick={() => setCreation(retreatCreation(creation))}>上一步</button>
          {step < 3 ? (
            <button type="button" className="button-primary" disabled={!canAdvanceCreation(creation)} onClick={next}>继续问道 <span>›</span></button>
          ) : (
            <button type="button" className="button-primary thunder-button" disabled={!canAdvanceCreation(creation)} onClick={next}>引雷入道</button>
          )}
        </footer>
      </section>
    </main>
  );
}

function StatPanel({ state }: { state: GameState }) {
  const { character: c, daoPattern: d, soul: s, territory: t } = state;
  const neededInsight = 12 + d.engraved * 4;
  return (
    <aside className="stat-panel panel">
      <div className="identity">
        <div className="avatar">{PATH_INFO[c.path].glyph}</div>
        <div><p>{ORIGINS[c.origin].name}</p><h2>{c.name}</h2><span>{c.path}途 · {VOWS[c.vow].name}</span></div>
      </div>
      <div className="realm-plaque">
        <span>当前境界</span><strong>{REALMS[c.realm]}</strong><small>{c.age} 岁 · 寿元 {c.lifespan}</small>
      </div>
      <div className="stat-row"><label>气血 <b>{c.health}/{c.maxHealth}</b></label><Meter value={c.health} max={c.maxHealth} tone="gold" /></div>
      <div className="stat-row"><label>灵气 <b>{c.qi}/{c.maxQi}</b></label><Meter value={c.qi} max={c.maxQi} /></div>
      <div className="stat-row"><label>神魂 <b>{s.power}/{s.maxPower}</b></label><Meter value={s.power} max={s.maxPower} tone="violet" /></div>
      <div className="stat-row"><label>魂魄稳固 <b>{s.stability}%</b></label><Meter value={s.stability} max={100} tone="cyan" /></div>
      <div className="mini-grid">
        <div><span>战力</span><b>{totalPower(state)}</b></div>
        <div><span>声望</span><b>{c.reputation}</b></div>
        <div><span>因果</span><b>{c.karma}</b></div>
        <div><span>回合</span><b>{state.turn}</b></div>
      </div>
      <div className="pattern-summary">
        <header><span>道纹领悟</span><b>{d.insight}/{neededInsight}</b></header>
        <Meter value={d.insight} max={neededInsight} tone="cyan" />
        <p><b>{d.engraved}</b> 道已凝 · 调和 {d.harmony}%</p>
        <div className="pattern-chips">
          {d.namedPatterns.length ? d.namedPatterns.slice(-4).map((name, index) => <span key={`${name}-${index}`}>{name}</span>) : <em>尚无成纹</em>}
        </div>
      </div>
    </aside>
  );
}

function MarketPanel({
  state,
  onBuy,
}: {
  state: GameState;
  onBuy: (id: string) => void;
}) {
  const stock = marketStock(state);
  return (
    <section className="panel market-card">
      <header><p className="section-label">法会</p><span>玄玉 {state.territory.spiritStones}</span></header>
      {stock.length ? (
        <div className="market-list">
          {stock.map((item) => {
            const price = buyPrice(state, item);
            const check = canBuy(state, item.id);
            return (
              <button
                type="button"
                key={item.id}
                disabled={!check.available}
                onClick={() => onBuy(item.id)}
                title={check.available ? item.description : check.reason}
              >
                <i className={`rarity-${item.rarity}`}>{item.name.slice(0, 1)}</i>
                <span><b>{item.name}</b><small>{check.available ? item.description : check.reason}</small></span>
                <em>{price} 玉</em>
              </button>
            );
          })}
        </div>
      ) : <p className="empty">境界尚浅，法会不为你开门。</p>}
    </section>
  );
}

function TerritoryPanel({
  state,
  onUseItem,
  onSellItem,
  onBuyItem,
}: {
  state: GameState;
  onUseItem: (id: string) => void;
  onSellItem: (id: string) => void;
  onBuyItem: (id: string) => void;
}) {
  const t = state.territory;
  const counts = state.inventory.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});
  return (
    <aside className="right-rail">
      <section className="panel territory-card">
        <header><p className="section-label">疆域山河</p><span>{t.nodes} 处灵地</span></header>
        <div className="domain-map" aria-hidden="true">
          <div className="mountain m1" /><div className="mountain m2" /><div className="mountain m3" />
          {Array.from({ length: Math.min(8, t.nodes) }).map((_, index) => <i key={index} style={{ '--node': index } as CSSProperties} />)}
          <b>山河令域</b>
        </div>
        <div className="resource-grid">
          <div><span>掌控</span><b>{t.control}%</b></div>
          <div><span>粮草</span><b>{t.food}</b></div>
          <div><span>玄玉</span><b>{t.spiritStones}</b></div>
          <div><span>威势</span><b>{t.influence}</b></div>
        </div>
      </section>
      <section className="panel inventory-card">
        <header><p className="section-label">乾坤囊</p><span>{state.inventory.length}/{INVENTORY_LIMIT}</span></header>
        {Object.keys(counts).length ? (
          <div className="inventory-list">
            {Object.entries(counts).map(([id, count]) => {
              const item = ITEMS.find((candidate) => candidate.id === id);
              if (!item) return null;
              const sellable = canSell(state, id);
              return (
                <div className="inventory-row" key={id}>
                  <button type="button" onClick={() => onUseItem(id)} title={`${item.description} 点击使用`}>
                    <i className={`rarity-${item.rarity}`}>{item.name.slice(0, 1)}</i>
                    <span><b>{item.name} {count > 1 ? `×${count}` : ''}</b><small>{item.description}</small></span>
                  </button>
                  <button
                    type="button"
                    className="sell-button"
                    disabled={!sellable.available}
                    onClick={() => onSellItem(id)}
                    title={sellable.available ? `售出得 ${sellPrice(state, item)} 玄玉` : sellable.reason}
                  >
                    售 {sellPrice(state, item)} 玉
                  </button>
                </div>
              );
            })}
          </div>
        ) : <p className="empty">囊中空空，唯余清风。</p>}
      </section>
      <MarketPanel state={state} onBuy={onBuyItem} />
    </aside>
  );
}

/** 道枢审计: the roll trail, the chain head, and what each layer guarantees. */
function AuditPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const records = buildAuditTable(state.rolls).slice().reverse();
  const intact = verifyStateChain(state);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="audit-title">
      <section className="audit-modal">
        <p className="step-kicker">道枢审计</p>
        <h2 id="audit-title">命卷可查，天机可验</h2>
        <div className="audit-chain">
          <p><span>链首</span><code>{state.chainStart.slice(0, 16)}…</code></p>
          <p><span>链尾</span><code>{state.auditHash.slice(0, 16)}…</code></p>
          <p><span>共 {state.rollCount} 掷 · {state.auditChain.length} 令</span>
            <b className={intact ? 'intact' : 'broken'}>{intact ? '链完好' : '链已断'}</b>
          </p>
        </div>
        <div className="audit-table" aria-label="逐掷记录">
          {records.length ? records.map((record) => (
            <p key={record.recordId} className={record.sealed ? 'sealed' : ''}>
              <code>{record.recordId}</code>
              <span>第 {record.turn} 回</span>
              <b>{record.die}={record.display}</b>
              <small>{record.reason}</small>
            </p>
          )) : <span className="empty">尚未掷出一骰。</span>}
        </div>
        <ol className="audit-layers">
          {ANTI_CHEAT_LAYERS.map((layer) => (
            <li key={layer.layer}><b>{layer.name}</b><small>{layer.desc}</small></li>
          ))}
        </ol>
        <button type="button" className="button-primary" onClick={onClose}>合卷</button>
      </section>
    </div>
  );
}

/** The duel takes over the stage: no other command is legal until it resolves. */
function CombatPanel({
  state,
  onTactic,
}: {
  state: GameState;
  onTactic: (tactic: CombatTactic) => void;
}) {
  const combat = state.combat!;
  const foe = getFoe(combat.foeId);
  return (
    <div className="panel combat-panel">
      <header className="stage-header">
        <div>
          <p className="section-label">斗法 · 第 {combat.round} 合</p>
          <h1>{foe?.name ?? combat.foeId}</h1>
        </div>
        <span className="weather">
          {combat.charged ? 'ϟ 蓄势已成' : combat.opening ? '⌖ 敌现破绽' : `⚔ 至多 ${MAX_COMBAT_ROUNDS} 合`}
        </span>
      </header>
      <div className="combat-bars">
        <div className="stat-row">
          <label>敌 <b>{combat.foeHp}/{combat.foeMaxHp}</b></label>
          <Meter value={combat.foeHp} max={combat.foeMaxHp} tone="gold" />
        </div>
        <div className="stat-row">
          <label>己 <b>{state.character.health}/{state.character.maxHealth}</b></label>
          <Meter value={state.character.health} max={state.character.maxHealth} tone="cyan" />
        </div>
      </div>
      <div className="actions-grid">
        {COMBAT_TACTICS.map((tactic, index) => {
          const availability = tacticAvailability(state, tactic);
          const meta = TACTIC_META[tactic];
          return (
            <button
              type="button"
              key={tactic}
              disabled={!availability.available}
              onClick={() => onTactic(tactic)}
              title={availability.reason}
            >
              <i>{meta.seal}</i>
              <span>
                <b>{tactic}<kbd>{index + 1}</kbd></b>
                <small>{availability.available ? meta.subtitle : availability.reason}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="combat-log" aria-live="polite" aria-label="斗法实录">
        {combat.log.slice(-6).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
      </div>
    </div>
  );
}

export function DaoJunGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [storage, setStorage] = useState<StorageAdapter | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    const adapter = getBrowserStorage();
    setStorage(adapter);
    if (adapter) {
      const result = loadGame<GameState>(adapter);
      if (result.ok) setState(result.state);
      else if (result.code !== 'empty') {
        setNotice(result.message);
        clearSave(adapter);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && state && storage) saveGame(storage, state);
  }, [loaded, state, storage]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const act = useCallback((action: CoreAction) => {
    setState((current) => {
      if (!current) return current;
      const result = performAction(current, action);
      setNotice(result.message);
      return result.state;
    });
  }, []);

  const choose = useCallback((index: 0 | 1) => {
    setState((current) => {
      if (!current) return current;
      const result = chooseEvent(current, index);
      setNotice(result.message);
      return result.state;
    });
  }, []);

  const strike = useCallback((tactic: CombatTactic) => {
    setState((current) => {
      if (!current) return current;
      const result = fightRound(current, tactic);
      setNotice(result.message);
      return result.state;
    });
  }, []);

  const answerMilestone = useCallback((accept: boolean) => {
    setState((current) => {
      if (!current) return current;
      const result = resolveMilestone(current, accept);
      setNotice(result.message);
      return result.state;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || !state || state.ending) return;
      const index = Number(event.key) - 1;
      if (state.pendingMilestone) return;
      if (state.pendingEvent) {
        if (index === 0 || index === 1) {
          event.preventDefault();
          choose(index);
        }
        return;
      }
      if (state.combat) {
        const tactic = COMBAT_TACTICS[index];
        if (tactic && tacticAvailability(state, tactic).available) {
          event.preventDefault();
          strike(tactic);
        }
        return;
      }
      if (index >= 0 && index < ACTIONS.length) act(ACTIONS[index]!);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [act, choose, strike, state]);

  const pending = useMemo(() => EVENTS.find((event) => event.id === state?.pendingEvent), [state?.pendingEvent]);
  const ending = getEnding(state?.ending ?? null);
  const milestone = getEnding(state?.pendingMilestone ?? null);

  if (!loaded) return <main className="loading-screen"><div className="title-sigil">道</div><p>引雷入卷……</p></main>;
  if (!state) return <Creation onComplete={(options) => setState(createGame(options))} />;

  const consume = (id: string) => {
    const result = useItem(state, id);
    setState(result.state);
    setNotice(result.message);
  };
  const sell = (id: string) => {
    const result = sellItem(state, id);
    setState(result.state);
    setNotice(result.message);
  };
  const buy = (id: string) => {
    const result = buyItem(state, id);
    setState(result.state);
    setNotice(result.message);
  };
  const restart = () => {
    if (!window.confirm('舍弃此世存档，重新入道？')) return;
    if (storage) clearSave(storage);
    setState(null);
  };

  return (
    <main className="game-shell">
      <div className="thunder-pattern thunder-pattern-game" aria-hidden="true" />
      <div className="lightning lightning-a" /><div className="lightning lightning-b" />
      <header className="topbar">
        <div className="brand"><span>道</span><div><b>道君</b><small>人生模拟器</small></div></div>
        <p>天有常道 · 人定其纹</p>
        <div className="top-actions">
          <span>自动存卷</span>
          <button type="button" onClick={() => setAuditOpen(true)}>道枢审计</button>
          <button type="button" onClick={restart}>重开此生</button>
        </div>
      </header>

      <div className="game-grid">
        <StatPanel state={state} />
        <section className="center-stage">
          {state.combat ? (
            <CombatPanel state={state} onTactic={strike} />
          ) : (
            <div className="panel action-panel">
              <header className="stage-header">
                <div><p className="section-label">道途抉择</p><h1>{REALMS[state.character.realm]} · 第 {state.turn + 1} 回</h1></div>
                <span className="weather">ϟ 雷意：{Math.round((state.daoPattern.harmony + state.soul.stability) / 2)}%</span>
              </header>
              <div className="actions-grid">
                {ACTIONS.map((action, index) => {
                  const availability = actionAvailability(state, action);
                  const meta = ACTION_META[action];
                  return (
                    <button type="button" key={action} disabled={!availability.available} onClick={() => act(action)} title={availability.reason}>
                      <i>{meta.seal}</i>
                      <span><b>{action}<kbd>{index + 1}</kbd></b><small>{availability.available ? meta.subtitle : availability.reason}</small><em>{meta.cost}</em></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <section className="panel chronicle">
            <header><p className="section-label">命卷纪事</p><span>近事 {Math.min(60, state.logs.length)} 则</span></header>
            <div className="log-list" aria-live="polite" aria-label="命卷纪事">
              {[...state.logs].reverse().map((entry, index) => (
                <article key={`${entry.turn}-${index}`} className={`tone-${entry.tone}`}>
                  <time>第 {entry.turn} 回</time><i /><p>{entry.text}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
        <TerritoryPanel state={state} onUseItem={consume} onSellItem={sell} onBuyItem={buy} />
      </div>

      {notice && <div className="toast" role="status">{notice}</div>}

      {auditOpen && <AuditPanel state={state} onClose={() => setAuditOpen(false)} />}

      {milestone && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="milestone-title" aria-describedby="milestone-description">
          <section className="event-modal">
            <div className="event-rune">问</div>
            <p className="step-kicker">道枢垂问 · {milestone.rank}品结局</p>
            <h2 id="milestone-title">{milestone.title}</h2>
            <p className="event-text" id="milestone-description">{milestone.description}</p>
            <div className="event-choices">
              <button type="button" onClick={() => answerMilestone(true)}>
                <span>受</span><div><b>就此收官</b><small>以此结局封存此生命卷</small></div><i>›</i>
              </button>
              <button type="button" onClick={() => answerMilestone(false)}>
                <span>辞</span><div><b>道途未尽</b><small>此结局不再垂问，继续问道</small></div><i>›</i>
              </button>
            </div>
          </section>
        </div>
      )}

      {pending && !milestone && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="event-title" aria-describedby="event-description">
          <section className="event-modal">
            <div className="event-rune">ϟ</div>
            <p className="step-kicker">天机骤变</p>
            <h2 id="event-title">{pending.title}</h2>
            <p className="event-text" id="event-description">{pending.text}</p>
            <div className="event-choices">
              {pending.choices.map((option, index) => (
                <button type="button" key={option.label} onClick={() => choose(index as 0 | 1)}>
                  <span>{index + 1}</span><div><b>{option.label}</b><small>{option.result}</small></div><i>›</i>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {ending && (
        <div className="modal-backdrop ending-backdrop" role="dialog" aria-modal="true" aria-labelledby="ending-title">
          <section className="ending-modal">
            <p>此生命卷 · {ending.rank}品结局</p>
            <div className="ending-seal">{ending.rank}</div>
            <h2 id="ending-title">{ending.title}</h2>
            <blockquote>{ending.description}</blockquote>
            <div className="ending-stats">
              <span>享年 <b>{state.character.age}</b></span>
              <span>道纹 <b>{state.daoPattern.engraved}</b></span>
              <span>疆域 <b>{state.territory.nodes}</b></span>
              <span>声望 <b>{state.character.reputation}</b></span>
            </div>
            <button type="button" className="button-primary" onClick={restart}>再入轮回</button>
          </section>
        </div>
      )}
    </main>
  );
}
