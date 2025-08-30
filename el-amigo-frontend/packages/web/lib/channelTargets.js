// Catálogo de canales y ubicaciones soportadas (MVP)
export const CHANNELS = {
  telegram:  { placements: ["chat"] },                  // envía a chat/canal/grupo
  facebook:  { placements: ["feed", "story"] },
  x:         { placements: ["feed"] },
  instagram: { placements: ["feed", "story"] },
  linkedin:  { placements: ["feed"] },
  tiktok:    { placements: ["feed"] },
  whatsapp:  { placements: ["status", "chatBroadcast"] }
};

export function normalizeTargets(targets = {}) {
  const out = {};
  for (const [ch, cfg] of Object.entries(targets)) {
    if (!CHANNELS[ch]) continue;
    const enabled = !!cfg?.enabled;
    const placement = (cfg?.placement && CHANNELS[ch].placements.includes(cfg.placement))
      ? cfg.placement
      : CHANNELS[ch].placements[0];
    out[ch] = { enabled, placement };
  }
  return out;
}
