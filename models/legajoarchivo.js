var mongoose = require('mongoose');

var LegArchivoSchema = new mongoose.Schema({
    IdLegajo:String,
    IdArchivo:String,
    OriginalName:String,
    UCreador:String,
    fecha: { type: Date, default: Date.now }
})

mongoose.model('LegajoArchivos', LegArchivoSchema);