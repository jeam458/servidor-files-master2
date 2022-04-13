let express = require('express'); 
let app = express(); 
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/incidencias');
let conn = mongoose.connection;
let multer = require('multer');
var cors = require('cors');
let GridFsStorage = require('multer-gridfs-storage');
let Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
let gfs = Grid(conn.db);
let port = 4000;

require('./models/legajoarchivo');
var LegajoArchivos = mongoose.model('LegajoArchivos');
app.use(cors());
// Setting up the root route
app.get('/', (req, res) => {
    res.send('Welcome to the express server');
});

// Allows cross-origin domains to access this API
app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin' , 'http://localhost:4200');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append("Access-Control-Allow-Headers", "Origin, Accept,Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    res.append('Access-Control-Allow-Credentials', true);
    next();
});

// BodyParser middleware
app.use(bodyParser.json());
let nameFile='';
// Setting up the storage element
let storage = GridFsStorage({
    gfs : gfs,

    filename: (req, file, cb) => {
        let date = Date.now();
        nameFile= file.fieldname + '-' + date + '.'
        // The way you want to store your file in database
        cb(null, file.fieldname + '-' + date + '.'); 
    },
    
    // Additional Meta-data that you want to store
    metadata: function(req, file, cb) {
        cb(null, { originalname: file.originalname });
    },
    root: 'ctFiles', // Root collection name
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...');
      },
      onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path);
      }
});

// Multer configuration for single file uploads
let upload = multer({
    storage: storage
}).single('file');

// Route for file upload
app.post('/upload/:id/:autor/:originalname', (req, res) => {
    console.log(req.params.id, req.params.autor, req.params.originalname);
    upload(req,res, (err) => {
        const file = req.file
        if(err){
             res.json({error_code:1,err_desc:err});
             return;
        }
        var temp = {
           IdLegajo:req.params.id,
           IdArchivo: nameFile,
           OriginalName: req.params.originalname,
           UCreador: req.params.autor
        }
        console.log(temp)
        var legajoarchivo = new LegajoArchivos(temp);
        legajoarchivo.save(function(err,legajoarchivo){
            if(err){return next(err)}
            console.log(legajoarchivo)
        })
        res.json({error_code:0, error_desc: null, file_uploaded: true});
    });
    
});

// Downloading a single file
app.get('/file/:filename', (req, res) => {
    gfs.collection('ctFiles'); //set collection name to lookup into

    /** First check if file exists */
    gfs.files.find({filename: req.params.filename}).toArray(function(err, files){
        if(!files || files.length === 0){
            return res.status(404).json({
                responseCode: 1,
                responseMessage: "error"
            });
        }
        // create read stream
        var readstream = gfs.createReadStream({
            filename: files[0].filename,
            root: "ctFiles"
        });
        // set the proper content type 
        res.set('Content-Type', files[0].contentType)
        // Return response
        return readstream.pipe(res);
    });
});

function getIdFile(filename){
    console.log(filename)
    gfs.collection('ctFiles');
    gfs.files.find({filename: filename}).toArray(function(err,files){
        console.log(files)
        if(!files || files.length === 0){
            return "no existe archivo"
        }
        return files[0].contentType;
    });
}

// Route for getting all the files
app.get('/files', (req, res) => {
    let filesData = [];
    let count = 0;
    gfs.collection('ctFiles'); // set the collection to look up into

    gfs.files.find({}).toArray((err, files) => {
        // Error checking
        if(!files || files.length === 0){
            return res.status(404).json({
                responseCode: 1,
                responseMessage: "error"
            });
        }
        // Loop through all the files and fetch the necessary information
        //console.log(files)
        files.forEach((file) => {
            filesData[count++] = {
                originalname: file.metadata.originalname,
                filename: file.filename,
                contentType: file.contentType,
                _id:file._id
            }
        });
        res.json(filesData);
    });
});


app.delete('/files/:id', (req, res) => {
    console.log(req.params.id);
    //var db = mongoose.connection.db;
    //var mongoDriver = mongoose.mongo;
    //var gfs = new Grid(db, mongoDriver);
    gfs.remove({ _id: req.params.id,root:'ctFiles'}, (err, gridStore) => {
        //console.log(gridStore)
      if (err) {
        return res.status(404).json({ err: err });
      }
      res.json({message:'elemento eliminado'})
      //res.redirect('/');
    });
  });



app.listen(port, (req, res) => {
    console.log("Server started on port: " + port);
});