const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const uuidv5 = require('uuid/v5');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({limit: "50mb"}));

const credFile = process.env.SERVICEACC_CRED_FILE || "./onfire.json";
console.log(credFile);
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
var deliveryCollection = db.collection('delivery');
var dhlPricingCollection = db.collection('dhl_pricing');

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
    deliveryCollection.doc(idValue)
        .create(deliveryPerson)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
});

app.post(API_URI + '/delivery-person/uuid/', (req, res)=>{
    let deliveryPerson = req.body;
    let idValue =  uuidv5('kennethphang.asia', uuidv5.DNS);
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

app.listen(3000,  ()=>{});