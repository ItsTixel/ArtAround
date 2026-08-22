const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// A clickable point of interest on a museum map image. `x`/`y` are
// normalized (0–1, relative to the map image's width/height) so the point
// stays correctly placed however the image is scaled/rendered.
const mapPointSchema = new Schema({
  label: { type: String, required: true, trim: true },
  icon_type: {
    type: String,
    enum: ['service', 'entity', 'generic'],
    default: 'generic'
  },
  x: { type: Number, required: true, min: 0, max: 1 },
  y: { type: Number, required: true, min: 0, max: 1 },
  // For icon_type 'service': matches a key of this museum's `services` map,
  // so the "Indicazioni" commands can jump straight to this point.
  service_key: { type: String, trim: true },
  // For icon_type 'entity': the artwork placed at this point.
  entity: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity' },
  description: { type: String, trim: true }
});

// One image (e.g. a floor plan) plus its points of interest. A museum can
// have zero, one, or several of these (typically one per floor).
const museumMapSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  image_url: { type: String, required: true, trim: true },
  points:    { type: [mapPointSchema], default: [] }
});

const museumSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  wikidata_id: { type: String, trim: true },
  description: { type: String, trim: true, default: '' },
  image_url:   { type: String, trim: true },
  website:     { type: String, trim: true },
  is_accessible: { type: Boolean, default: false },
  address: {
    street:  { type: String, trim: true, required: true },
    city:    { type: String, trim: true, required: true },
    zip:     { type: String, trim: true, required: true },
    country: { type: String, trim: true, default: 'Italia', required: true }
  },
  // Maps a service name (e.g. "Toilette", "Uscita", or any museum-specific
  // extra like "Guardaroba") to the phrase read aloud to indicate where it is.
  services: {
    type: Map,
    of: { type: String, trim: true },
    default: {}
  },
  // Maps an accessibility feature name (e.g. "Accesso", "Ascensore") to a
  // free-text description of it, at the creator's discretion.
  accessibility_info: {
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
  maps: { type: [museumMapSchema], default: [] },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

museumSchema.virtual('entities', {
  ref: 'Entity', localField: '_id', foreignField: 'placements.museum'
});

const Museum = model('Museum', museumSchema);

module.exports = Museum;
