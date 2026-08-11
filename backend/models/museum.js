const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const museumSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  wikidata_id: { type: String, trim: true },
  description: { type: String, trim: true, default: '' },
  image_url:   { type: String, trim: true },
  website:     { type: String, trim: true },
  address: {
    street:  { type: String, trim: true },
    city:    { type: String, trim: true },
    zip:     { type: String, trim: true },
    country: { type: String, trim: true, default: 'Italia' }
  },
  // Maps a service name (e.g. "Toilette", "Uscita", or any museum-specific
  // extra like "Guardaroba") to the phrase read aloud to indicate where it is.
  services: {
    type: Map,
    of: { type: String, trim: true },
    default: {}
  },
  // Maps a day of the week (e.g. "Lunedì") to the opening hours for that day
  // (e.g. "9:00–19:00" or "Chiuso").
  opening_hours: {
    type: Map,
    of: { type: String, trim: true },
    default: {}
  },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

museumSchema.virtual('entities', {
  ref: 'Entity', localField: '_id', foreignField: 'placements.museum'
});

const Museum = model('Museum', museumSchema);

module.exports = Museum;
