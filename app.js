const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const uuidv4 = require('uuid/v4');
const multer = require('multer');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({limit: "50mb"}));
app.use(cors());

//export GOOGLE_APPLICATION_CREDENTIALS=/Users/phangty/Projects/paf-day26/onfire.json
//setx GOOGLE_APPLICATION_CREDENTIALS=/Users/phangty/Projects/paf-day26/onfire.json
//set GOOGLE_APPLICATION_CREDENTIALS=/Users/phangty/Projects/paf-day26/onfire.json
var gCloudEnv = require('./onfire.json');
console.log(gCloudEnv.project_id);
const gStorage = new Storage({
    projectId: gCloudEnv.project_id
});
const bucket = gStorage.bucket("day26-38142.appspot.com");

const googleMulter = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize:  20 * 1024 * 1024 //20MB
    }
})

const credFile = process.env.SERVICEACC_CRED_FILE || "./onfire.json";
var serviceAccount = require(credFile);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://day26-38142.firebaseio.com" 
});

const API_URI = "/api";
var addedCounter = 0;
var updateCounter = 0;

admin.firestore.FieldValue.serverTimestamp();
var db  = admin.firestore();
const settings = { timestampsInSnapshots: true};
db.settings(settings);
var deliveryCollection = db.collection('delivery');
var dhlPricingCollection = db.collection('dhl_pricing');
var galleryCollection = db.collection('gallery');
var stallCollection = db.collection('stall');


var unSubscribe = subscribeDelivery();

function subscribeDelivery(){
    return deliveryCollection.onSnapshot((snapshot)=>{
        if(!snapshot.empty){
            //console.log(snapshot);
            snapshot.docChanges.forEach((data)=>{
                console.log(`====>${Date()} ${updateCounter}` + data.type);
                if(data.type === 'modified'){
                    //do #1
                    updateCounter = updateCounter + 1;
                }else if(data.type === 'added'){
                    //do #1
                    addedCounter = addedCounter + 1;
                }
            })
        }
    });
}


app.post(API_URI + '/upload', googleMulter.single('img'), (req, res)=>{
    console.log("upload ....");
    if(req.file != null){
        console.log("Got it !");
        console.log(req.file);
        uploadToFirebase(req.file).then((result)=>{
            console.log(result);
            console.log(result.data);
            var galleryData = {
                filename: result
            }
            galleryCollection
            .add(galleryData)
            .then(result => res.status(200).json(galleryData))
            .catch(error => res.status(500).json(error));
        }).catch((error)=>{
            console.log(error);
            res.status(500).json(error);
        })
    }else{
        res.status(500).json({error: "error in uploading"});
    }
    
});


const uploadToFirebase = (fileObject)=> {
    return new Promise((resolve, reject)=>{
        if(!fileObject){
            reject('Invalid file upload');
        }

        let idValue =  uuidv4();
        console.log(idValue);
        let newFilename = `${idValue}_${fileObject.originalname}`
        console.log(newFilename);
        
        let firebaseFileUpload = bucket.file(newFilename);
        console.log(firebaseFileUpload);
        console.log("fileObject.mimeType > " + fileObject.mimetype);
        const blobStream = firebaseFileUpload.createWriteStream({
            metadata: {
                contentType: fileObject.mimetype
            }
        });

        blobStream.on("error", (error)=>{
            console.log("error !!!! " + error);
            reject("Error in uploading file stream problem !");
        });

        blobStream.on("finish", ()=>{
            console.log("FINISH !");
            let firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/day26-38142.appspot.com/o/${firebaseFileUpload.name}?alt=media&token=c31d1760-fbaf-4986-858d-017a0ee93e0c`;
            fileObject.fileURL = firebaseUrl;
            resolve(firebaseUrl);
        });

        blobStream.end(fileObject.buffer);
    });
}


app.post(API_URI + '/multiple-upload', googleMulter.array('imgs', 12), function (req, res, next) {
    res.status(200).json({});
});


app.get(API_URI + '/foodstall',(req, res)=>{
    let idValue = req.query.id;
    stallCollection.doc(idValue).get()
    .then(result => {
        console.log(result.data());
        let stallCombined = {
            stallName: result.data(),
            foods : [],
        }
        stallCollection.doc(idValue).collection("food_menu").get()
        .then(snapshot => {
            console.log(snapshot);
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
                stallCombined.foods.push(doc.data());
            });
            console.log(stallCombined.foods);
            res.status(200).json(stallCombined);
        })
        .catch(err => {
            console.log('Error getting food menu', err);
        });
    })
    .catch(err => {
        console.log('Error getting stalls', err);
    });
});


app.get(API_URI + '/delivery-person',(req, res)=>{
    //deliveryCollection.
    deliveryCollection.get()
    .then(snapshot => {
      let deliveryArr  = [];
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        deliveryArr.push(doc.data());
      });
      res.status(200).json(deliveryArr);
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
});

app.get(API_URI + '/dhl-pricing', (req, res)=>{
    
    dhlPricingCollection
        .orderBy('price')
        .startAt(1)
        .endBefore(51)
        .limit(10)
    .get()
    .then(snapshot => {
      let dhlPricingArr  = [];
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        dhlPricingArr.push(doc.data());
      });
      res.status(200).json(dhlPricingArr);
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
})

app.get(API_URI + '/delivery-person2',(req, res)=>{
    let driversName = req.query.driverName;
    let vehType = req.query.type;
    console.log(driversName);
    
    deliveryCollection
        .where('driver_name', '==', driversName)
        .where('vehicle_type', '==', vehType)
        .limit(20)
    .get()
    .then(snapshot => {
      let deliveryArr  = [];
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        deliveryArr.push(doc.data());
      });
      res.status(200).json(deliveryArr);
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
});

app.post(API_URI + '/delivery-person', (req, res)=>{
    let deliveryPerson = req.body;
    console.log(deliveryPerson);
    let idValue =  uuidv4();
    deliveryCollection.doc(idValue)
        .create(deliveryPerson)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

app.post(API_URI + '/delivery-person2', (req, res)=>{
    let deliveryPerson = req.body;
    deliveryPerson = { ...req.body };
    deliveryCollection
        .add(deliveryPerson)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

app.post(API_URI + '/delivery-person/uuid/', (req, res)=>{
    let deliveryPerson = req.body;
    let idValue =  uuidv4();
    //let idValue = req.params.id;
    console.log(deliveryPerson);
    deliveryCollection.doc(idValue)
        .create(deliveryPerson)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

app.post(API_URI + '/delivery-person/:id', (req, res)=>{
    let deliveryPerson = req.body;
    let idValue = req.params.id;
    console.log(deliveryPerson);
    deliveryCollection.doc(idValue)
        .set(deliveryPerson)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

app.put(API_URI + '/delivery-person/:id', (req,res)=>{
    let idValue = req.params.id;
    let deliveryPerson = req.body;
    deliveryCollection.doc(idValue).update(
        deliveryPerson
    , {merge: true});
    res.status(200).json(deliveryPerson);
});

app.delete(API_URI + '/delivery-person/:id', (req,res)=>{
    let idValue = req.params.id;
    deliveryCollection.doc(idValue).delete().then((result)=>{
        res.status(200).json(result);
    }).catch((error)=>{
        res.status(500).json(error);
    });
});

app.get(API_URI + '/unsubscribe-delivery', (req, res)=>{
    unSubscribe();
    res.status(200)
        .json(
            {addedCounter: addedCounter, 
            updateCounter: updateCounter});
});

app.get(API_URI + '/subscribe-delivery', (req, res)=>{
    unSubscribe = subscribeDelivery();
    res.status(200)
        .json(
            {addedCounter: addedCounter, 
            updateCounter: updateCounter});
})

const NODE_PORT = process.env.PORT | 3000;
app.listen(NODE_PORT,  ()=>{ console.log(`Backend started at ${NODE_PORT} ${new Date()}`)});