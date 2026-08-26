const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const visitStepSchema = new Schema({
  entity: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  logistic_note: { type: String, trim: true },
  intro_note: { type: String, trim: true },
  order: { type: Number, required: true },
  museum: { type: mongoose.Schema.Types.ObjectId, ref: 'Museum', required: true }
}, { _id: true });

// Stato della visita di gruppo "live" in corso. Sotto-documento singolo (non
// un array/storico): a ogni riapertura da parte del professore viene
// sovrascritto per intero — nessuno storico multi-sessione per ora.
const liveParticipantSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joined_at: { type: Date, default: Date.now },
  tone: { type: String, enum: ['childish', 'simple', 'medium', 'technical'], default: 'medium' },
  paragraph_index: { type: Number, default: 0 },
  playback_state: { type: String, enum: ['playing', 'paused'], default: 'playing' },
  ready: { type: Boolean, default: false },
  // Tag dell'approfondimento (Entity) attualmente aperto nella InsightModal
  // dello studente, null quando non ne ha nessuno aperto. insight_tags_viewed
  // è lo storico (deduplicato) di tutti i tag aperti durante la sessione,
  // usato dal professore per vedere quali approfondimenti ha ascoltato.
  // insight_tone/insight_paragraph_index/insight_playback_state rispecchiano
  // per l'approfondimento in corso lo stesso dettaglio (tono/paragrafo/pausa)
  // già tracciato per l'opera principale.
  active_insight_tag: { type: String, default: null },
  insight_tags_viewed: { type: [String], default: [] },
  insight_tone: { type: String, enum: ['childish', 'simple', 'medium', 'technical'], default: null },
  insight_paragraph_index: { type: Number, default: null },
  insight_playback_state: { type: String, enum: ['playing', 'paused'], default: null },
  quiz_answers: { type: [Number], default: [] },
  quiz_score: { type: Number, default: null }
}, { _id: false });

const liveSessionSchema = new Schema({
  status: { type: String, enum: ['idle', 'waiting', 'active', 'quiz', 'finished'], default: 'idle' },
  current_step_index: { type: Number, default: 0 },
  opened_at: Date,
  started_at: Date,
  quiz_started_at: Date,
  participants: { type: [liveParticipantSchema], default: [] }
}, { _id: false });

// Include anche la forma a 8 cifre (#RRGGBBAA): il bordo "vetro" (vedi
// glass_border sotto) è nativamente traslucido, un hex senza alpha lo
// renderebbe un anello opaco invece del filo di luce che ci si aspetta.
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Nome famiglia Google Fonts: lettere/cifre/spazi, niente virgolette o
// caratteri che potrebbero rompere l'URL o la dichiarazione CSS generata lato client.
const FONT_FAMILY_PATTERN = /^[A-Za-z0-9 ]{1,60}$/;

const themePaletteSchema = new Schema({
  accent: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  accent_hover: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  on_accent: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  // Secondo colore di selezione, distinto da `accent` (usato per le pillole
  // durata/tono, le tessere "pronto" in Gruppo, il punto attivo in Mappa).
  info: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  bg: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  surface: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  text: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  text_muted: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  border: { type: String, trim: true, match: HEX_COLOR_PATTERN },
  // Bordo delle superfici "vetro" (glass-panel/glass-capsule/glass-pill),
  // distinto da `border` (bordo generico degli altri elementi UI).
  glass_border: { type: String, trim: true, match: HEX_COLOR_PATTERN }
}, { _id: false });

// Aspetto personalizzato per la visita: palette chiara/scura (seguono lo
// stesso toggle tema dell'app) e font, applicati solo lato Navigator mentre
// la visita è attiva (vedi navigator/src/hooks/useVisitTheme.js). Ogni
// chiave è facoltativa: quelle assenti restano ai default dell'app.
const visitThemeSchema = new Schema({
  light: themePaletteSchema,
  dark: themePaletteSchema,
  font_serif: { type: String, trim: true, maxLength: 60, match: FONT_FAMILY_PATTERN },
  font_sans: { type: String, trim: true, maxLength: 60, match: FONT_FAMILY_PATTERN }
}, { _id: false });

const visitSchema = new Schema({
  title: { type: String, required: true, trim: true, maxLength: 200 },
  description: { type: String, trim: true, default: '' },

  museum: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Museum' }],

  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  steps: {
    type: [visitStepSchema],
    required: true,
    validate: {
      validator: v => v.length > 0,
      message: 'One visit must have at least one step'
    }
  },

  base_price: { type: Number, default: 0, min: [0, 'Price must be non negative'] },

  image_url: { type: String, trim: true },
  tags: { type: [String], default: [] },

  theme: visitThemeSchema,

  is_public: { type: Boolean, default: true },

  estimated_duration_sec: { type: Number },

  is_group: { type: Boolean, default: false },

  // Univoco solo tra le visite che lo hanno: sparse così le visite singole
  // (che non hanno code) non violano l'indice unique.
  code: {
    type: String,
    trim: true,
    uppercase: true,
    minLength: 4,
    maxLength: 15,
    unique: true,
    sparse: true
  },

  // Facoltativo anche per le visite di gruppo: l'autore può scegliere di
  // non aggiungerlo in fase di creazione (o toglierlo/aggiungerlo in seguito).
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },

  live_session: { type: liveSessionSchema, default: () => ({}) }

}, { timestamps: true });

visitSchema.pre('save', async function () {
  // Le visite di gruppo non sono mai pubbliche né a pagamento: questo rende
  // gratuiti sia il paywall (isVisitUnlocked già ritorna true a base_price 0)
  // sia il controllo di privacy di base (is_public), senza altra logica.
  if (this.is_group) {
    this.is_public = false;
    this.base_price = 0;
  }

  const Entity = mongoose.model('Entity');
  const Item = mongoose.model('Item');

  const entityIds = this.steps.map(s => s.entity);
  const allItemIds = this.steps.flatMap(s => s.items);

  const [entities, items] = await Promise.all([
    Entity.find({ _id: { $in: entityIds } }).select('placements').lean(),
    Item.find({ _id: { $in: allItemIds } }).select('descriptions license author').lean()
  ]);

  const entityMap = new Map(entities.map(e => [e._id.toString(), e]));
  const itemMap = new Map(items.map(i => [i._id.toString(), i]));

  // 1. Validate step.museum is a placement of step.entity
  for (const step of this.steps) {
    const entity = entityMap.get(step.entity.toString());
    if (!entity) throw new Error(`Entity ${step.entity} not found`);
    const inPlacements = entity.placements.some(p => p.museum.toString() === step.museum.toString());
    if (!inPlacements) {
      throw new Error(`Museum ${step.museum} is not a placement of entity ${step.entity}`);
    }
  }

  // 1b. Private/Reserved items can only be used in a visit by their own author
  for (const step of this.steps) {
    for (const itemId of step.items) {
      const item = itemMap.get(itemId.toString());
      if (!item) throw new Error(`Item ${itemId} not found`);
      if (item.license !== 'Public' && item.author.toString() !== this.author.toString()) {
        throw new Error(`Item ${itemId} is ${item.license} and can only be used in a visit by its author`);
      }
    }
  }

  // 2. Infer visit.museum from the union of step museums
  const museumSet = new Set(this.steps.map(s => s.museum.toString()));
  this.museum = [...museumSet].map(id => new mongoose.Types.ObjectId(id));

  // 3. Infer estimated_duration_sec: sum of each item's average description duration
  let totalDuration = 0;
  for (const step of this.steps) {
    for (const itemId of step.items) {
      const item = itemMap.get(itemId.toString());
      if (item && item.descriptions.length > 0) {
        const avg = item.descriptions.reduce((sum, d) => sum + d.duration_sec, 0) / item.descriptions.length;
        totalDuration += avg;
      }
    }
  }
  this.estimated_duration_sec = totalDuration;
});

const Visit = model('Visit', visitSchema);

module.exports = Visit;
