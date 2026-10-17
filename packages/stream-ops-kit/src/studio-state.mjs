// StudioStateV1: contrato del estado de AI Factory Studio.
//
// Regla de verdad: todo arranca en UNKNOWN / null. Un campo solo sale de ese valor si
// existe evidence[<ruta>] = { source, at } que diga quién lo midió y cuándo. Este módulo
// no produce estado ni abre endpoints: solo define el contrato y lo valida.
// La iluminación/ambiente del estudio NO es estado: el frontend la deriva de `stage`.

export const STUDIO_STATE_VERSION = 'StudioStateV1';

export const MODES = ['UNKNOWN', 'MUSIC'];
export const STAGES = ['UNKNOWN', 'COMPOSE', 'ARRANGE', 'MIX', 'MASTER', 'RELEASE'];
export const AGENT_STATES = ['UNKNOWN', 'IDLE', 'WAITING', 'EXECUTING'];
export const APPROVALS = ['UNKNOWN', 'PENDING', 'APPROVED', 'REJECTED'];
export const AGENT_KEYS = ['claude', 'opencode', 'music', 'reviewer'];
export const STEM_KEYS = ['vocals', 'melody', 'bass', 'drums'];

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isIso = (x) => typeof x === 'string' && x !== '' && !Number.isNaN(Date.parse(x));
const nonEmpty = (x) => typeof x === 'string' && x.trim() !== '';
const oneOf = (list) => (v) => list.includes(v);

// ruta -> [predicado, descripción]. null (o 'UNKNOWN' en los enums) siempre es válido.
const LEAVES = {
  mode: [oneOf(MODES), `one of ${MODES.join('|')}`],
  stage: [oneOf(STAGES), `one of ${STAGES.join('|')}`],
  'track.title': [nonEmpty, 'non-empty string'],
  'track.bpm': [(v) => isNum(v) && v >= 20 && v <= 300, 'number 20..300'],
  'track.playing': [(v) => typeof v === 'boolean', 'boolean'],
  energy: [(v) => isNum(v) && v >= 0 && v <= 1, 'number 0..1'],
  'audio.masterDb': [(v) => isNum(v) && v <= 6, 'number <= 6 (dB)'],
  ...Object.fromEntries(STEM_KEYS.map((k) => [`audio.stems.${k}`, [(v) => isNum(v) && v >= 0 && v <= 1, 'number 0..1']])),
  ...Object.fromEntries(AGENT_KEYS.map((k) => [`agents.${k}`, [oneOf(AGENT_STATES), `one of ${AGENT_STATES.join('|')}`]])),
  humanApproval: [oneOf(APPROVALS), `one of ${APPROVALS.join('|')}`],
  'stream.live': [(v) => typeof v === 'boolean', 'boolean'],
  'stream.fps': [(v) => isNum(v) && v >= 0 && v <= 240, 'number 0..240'],
  'stream.droppedFrames': [(v) => Number.isInteger(v) && v >= 0, 'integer >= 0'],
};

export const STUDIO_STATE_PATHS = Object.keys(LEAVES);

export function defaultStudioState() {
  return {
    version: STUDIO_STATE_VERSION,
    generatedAt: null,
    mode: 'UNKNOWN',
    stage: 'UNKNOWN',
    track: { title: null, bpm: null, playing: null },
    energy: null,
    audio: { masterDb: null, stems: Object.fromEntries(STEM_KEYS.map((k) => [k, null])) },
    agents: Object.fromEntries(AGENT_KEYS.map((k) => [k, 'UNKNOWN'])),
    humanApproval: 'UNKNOWN',
    approvalEvidence: null, // { by, at, ref }: obligatoria si humanApproval === 'APPROVED'
    stream: { live: null, fps: null, droppedFrames: null },
    events: [], // [{ at, source, text }]: sin source no hay evento
    evidence: {}, // { '<ruta>': { source, at } }
  };
}

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const isUnknown = (v) => v === null || v === 'UNKNOWN';

const TOP_KEYS = Object.keys(defaultStudioState());

export function validateStudioState(state) {
  const errors = [];
  if (state === null || typeof state !== 'object' || Array.isArray(state)) return { ok: false, errors: ['state must be an object'] };
  if (state.version !== STUDIO_STATE_VERSION) errors.push(`version must be ${STUDIO_STATE_VERSION}`);
  for (const k of Object.keys(state)) if (!TOP_KEYS.includes(k)) errors.push(`unexpected key: ${k}`);
  if (state.generatedAt !== null && !isIso(state.generatedAt)) errors.push('generatedAt must be null or ISO date');

  const evidence = state.evidence && typeof state.evidence === 'object' && !Array.isArray(state.evidence) ? state.evidence : null;
  if (!evidence) errors.push('evidence must be an object');

  for (const [path, [ok, desc]] of Object.entries(LEAVES)) {
    const v = get(state, path);
    if (v === undefined) { errors.push(`${path}: missing`); continue; }
    if (v !== null && !ok(v)) { errors.push(`${path}: must be null or ${desc}`); continue; }
    if (!isUnknown(v)) {
      const ev = evidence?.[path];
      if (!ev || !nonEmpty(ev.source) || !isIso(ev.at)) errors.push(`${path}: value without evidence {source, at}`);
    }
  }
  for (const path of Object.keys(evidence ?? {})) if (!LEAVES[path]) errors.push(`evidence for unknown path: ${path}`);

  if (state.humanApproval === 'APPROVED') {
    const a = state.approvalEvidence;
    if (!a || !nonEmpty(a.by) || !isIso(a.at) || !nonEmpty(a.ref)) errors.push('humanApproval APPROVED requires approvalEvidence {by, at, ref}');
  } else if (state.approvalEvidence != null) {
    errors.push('approvalEvidence is only allowed when humanApproval is APPROVED');
  }

  if (!Array.isArray(state.events)) errors.push('events must be an array');
  else state.events.forEach((e, i) => {
    if (!e || !isIso(e.at) || !nonEmpty(e.source) || !nonEmpty(e.text)) errors.push(`events[${i}]: requires {at, source, text}`);
  });

  return { ok: errors.length === 0, errors };
}

// RELEASE solo se habilita con aprobación humana explícita y válida.
export function releaseEnabled(state) {
  const { ok } = validateStudioState(state);
  return ok && state.humanApproval === 'APPROVED';
}
