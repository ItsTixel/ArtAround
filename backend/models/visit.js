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
