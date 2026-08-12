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

  estimated_duration_sec: { type: Number }

}, { timestamps: true });

visitSchema.pre('save', async function () {
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
