const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const entitySchema = new Schema({
  wikidata_id: { type: String, trim: true },
  local_id: { type: String, trim: true },

  name: { type: String, required: true, trim: true },
  is_physical: { type: Boolean, required: true },

  artwork_author: { type: String, trim: true },

  description: { type: String, trim: true, default: '' },
  image_url: { type: String, trim: true },
  alt_text: { type: String, trim: true },

  placements: [{
    museum:   { type: mongoose.Schema.Types.ObjectId, ref: 'Museum', required: true },
    location: {
      room:  { type: String, trim: true },
      floor: { type: String, trim: true },
      note:  { type: String, trim: true }
    }
  }],


  tags: { type: [String], default: [] },

  external_links: [{
    label: { type: String, trim: true },
    url: { type: String, trim: true }
  }],

  added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

entitySchema.statics.generateLocalId = async function () {
  const last = await this.findOne({ local_id: /^AA-/ })
    .sort({ local_id: -1 })
    .select('local_id');
  const n = last ? parseInt(last.local_id.replace('AA-', ''), 10) + 1 : 1;
  return 'AA-' + String(n).padStart(5, '0');
};

const Entity = model('Entity', entitySchema);

module.exports = Entity;
