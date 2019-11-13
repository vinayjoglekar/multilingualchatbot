var express = require('express');
var app = express();

var i18n = require('i18n');

i18n.configure({
  //define how many languages we would support in our application
  locales: ['en', 'hi'],
  //define the path to language json files, default is /locales
  directory: __dirname + '/locales',
  //define the default language
  defaultLocale: 'en',
  // define a custom cookie name to parse locale settings from 
  cookie: 'i18n'
});

app.use(i18n.init);

const config = require('config');
const dbConfig = config.get('dbConfig');
const collectionsConfig = config.get('collectionsConfig');
// const responseFormat = config.get('responseFormat');
const errormessages = config.get('errormessages');

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const mongo = require('mongodb');
var query = { 'Primary E-mail ID': 'abhishek.sharma@gmail.com' };
var response = '';
var projectParam = '';

app.post('/', function (req, res) {
  mongo.connect(dbConfig.get('host'), { useNewUrlParser: true, useUnifiedTopology: true }, (err, db) => {
    if (err) {
      sendResponse(errormessages.get('connectionError'), res);
      return;
    }
    var dbo = db.db(dbConfig.get('dbName'));
    var languageCode = req.body.queryResult.languageCode;
    console.log(languageCode);
    i18n.setLocale(languageCode);
    var param = req.body.queryResult.parameters.consumer_myaccount;
    console.log(param);
    if (param) {
      console.log(param);
      var cursor = createCursorToSearchData(param, dbo);
      cursor.each(function (error, result) {
        if (error) {
          sendResponse(errormessages.get('fetchError'), res);
          return;
        }
        if (result != null) {
          sendResponse(formatResponse(projectParam, param, result), res)
          db.close();
        }
      });
    } else {
      param = req.body.queryResult.parameters.address;
      if (!param) {
        sendResponse(errormessages.get('bad request'), res);
        return;
      }
      console.log(param);
      var newvalues = { $set: { 'Address 1': param } }
      dbo.collection(dbConfig.get('collectionName')).updateOne(query, newvalues, function (err, response) {
        if (err) throw err;
        else {
          sendResponse(i18n.__('address_change',param), res);
        }
        db.close();
      });
    }
  });
});

app.listen(dbConfig.get('port'));

function sendResponse(message, res) {
  let responobj = {
    "fulfillmentText": message,
    "fulfillmentmessages": "",
    "source": " ",
  }
  res.end(JSON.stringify(responobj));
}

function createCursorToSearchData(param, dbo) {
  var cursor = null;
  projectParam = collectionsConfig.get(param);
  cursor = dbo.collection(dbConfig.get('collectionName')).find(query).project({ [projectParam]: 1, _id: 0 });
  return cursor;
}

function formatResponse(projectParam, param, result) {
  // response = responseFormat.get([param]);
  response = i18n.__(param, result[[projectParam]]);
  console.log(param);
  return response ;
}