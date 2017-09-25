// This loads the environment variables from the .env file
require('dotenv-extended').load();
var mysql = require('mysql');
var mssql = require('mssql');
fs = require('fs');
var builder = require('botbuilder');
var restify = require('restify');
var smecontroller = require('./controllers/smecontroller');
var Store = require('./store');
var spellService = require('./spell-service');
var utility = require('./utility');
var server = require('./server');
var Promise = require('bluebird');
var util = require('util');
var request = require('request-promise').defaults({ encoding: null });

var value =process.env["USERPROFILE"];
console.log('user details %s',value); 

var con = server.createConnection();
/*con.connect(function(err) {
    if (err) throw err;
});*/
var sme_name;
exports.sme_name = sme_name;
exports.set_sme_names = function set_sme_names(sme_names) {
    sme_name=sme_names;
  }
// *********************************************************//
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// *********************************************************//
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());
//server.get('/api/messages', connector.listen());
// *********************************************************//
   var bot = new builder.UniversalBot(connector, function (session) {
    var msg = session.message;
    /*if (msg.attachments.length) {

        // Message with attachment, proceed to download it.
        // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
        var attachment = msg.attachments[0];
        var fileDownload = checkRequiresToken(msg)
            ? requestWithToken(attachment.contentUrl)
            : request(attachment.contentUrl);
           // session.send(attachment);
           //fs.writeFile('D:\\attachment/orders_sample1.pdf', fileDownload, { encoding : 'utf8'});
           //fileDownload.pipe(fs.createWriteStream('D:\\attachment/orders_sample1.pdf'));
           fileDownload.pipe(fs.createWriteStream('D:\\attachment/logo.png'));
           //session.send(fileDownload);
           //sendInline(session, 'D:\\attachment\\Zahoor_Bhat.docx', 'text/plain', 'Zahoor_Bhat.docx');
           var msg = new builder.Message(session)
           .addAttachment({
               contentUrl: 'D:\\attachment\\Zahoor_Bhat.docx',
               //contentType: 'application/pdf',
               contentType: 'text/plain',
              // contentType: 'image/png',
               name: 'Zahoor_Bhat.docx'
           });
       
       session.send(msg);
        fileDownload.then(
            function (response) {

                // Send reply with attachment type & size
                var reply = new builder.Message(session)
                    .text('Attachment of %s type and size of %s bytes received.', attachment.contentType, response.length);
                    session.send(reply);

            }).catch(function (err) {
                console.log('Error downloading attachment:', { statusCode: err.statusCode, message: err.response.statusMessage });
            });
    }*/
   session.send('Sorry, I did not understand \'%s\' ', session.message.text);
  });

// *********************************************************//  
// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

// *********************************************************//

// Handling the Greeting intent. 
bot.dialog('Greeting', function (session, args) {
//	console.log ('in greeting ');
    session.send('Hello Welcome to Skill Management');
    session.send('I can help you in finding SME/Expert for any skill and also their availability');
}).triggerAction({
    matches: 'Greeting'
 }); 

// Handling goodbye intent
bot.dialog('GoodBye', function (session, args) {
    //	console.log ('in greeting ');
    session.send('Hello Welcome to Skill Management');
        session.send('OK...Bye...See you later');
        session.endConversation();
        // session.endDialog();
    }).triggerAction({
        matches: 'GoodBye'
     }); 

bot.dialog('FindSME', function (session, args) {

    var skillEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'NSkill');
     // console.log(skillEntity);
     if (skillEntity)  {
        smecontroller.findsme(skillEntity ,session,con);
        }
     else 
        { 
           session.send('I can not identify the phrase. Can you try any other phrase?') ;
           session.endDialog();
        }
   
}).triggerAction({
    matches: 'FindSME'
}); 

// builder.Prompts.confirm(session, "Are you sure you want to know the SME (Yes/No)?");

 // Handling showprofile intent
 bot.dialog('ShowProfile', function (session, args) {
    var ResourceEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Resource');
    var contentUrl="";
    if(ResourceEntity){
    if (fs.existsSync('D:\\attachment\\'+ResourceEntity.entity+'.png')) {
        contentUrl = 'D:\\attachment\\'+ResourceEntity.entity+'.png'
    }
    else if (fs.existsSync('D:\\attachment\\'+ResourceEntity.entity+'.jpeg')) {
        contentUrl = 'D:\\attachment\\'+ResourceEntity.entity+'.jpeg'
    }
    else if (fs.existsSync('D:\\attachment\\'+ResourceEntity.entity+'.jpg')) {
        contentUrl = 'D:\\attachment\\'+ResourceEntity.entity+'.jpg'
    }
    else{
        session.send("profile for %s does not exists please upload it first ",ResourceEntity.entity);
    }
    if(contentUrl != ""){
    var msg = new builder.Message(session)
    .addAttachment({
        contentUrl: contentUrl,
        //contentType: 'application/pdf',
        //contentType: 'text/plain',
        contentType: 'image/png',
        name: ResourceEntity.entity
    });
    session.send(msg);
    }
   }
   else{
    session.send("profile not found",ResourceEntity.entity);
   }
    }).triggerAction({
        matches: 'ShowProfile'
     });
// *********************************************************//
bot.dialog('FindAvailability', function (session, args) {
    
        var ResourceEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Resource');
        var skillEntity  =  builder.EntityRecognizer.findEntity(args.intent.entities, 'NSkill');
        var dtEntity      = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.datetimeV2.date');
        var dtrEntity    = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.datetimeV2.daterange');
        
        console.log(dtrEntity);

        if (dtrEntity) {
            var dtr_start = dtrEntity.resolution.values[1].start;
            var dtr_end =   dtrEntity.resolution.values[1].end;
             //   session.send('Date range determined is %s %s %s',dtr_obj.getDate(),dtrange_obj.getMonth() + 1,dtrange_obj.getFullYear());
             //   session.endDialog();
            }
             else
                {
           //   session.send('Date range can not be determined');
            //  session.endDialog();
                }

       if (dtEntity) {
       // var dt_obj = new Date(dtEntity.resolution.values[0]['value']);
      //  var dt_obj = new Date(dtEntity.resolution.values[0].value)
         //   session.send('Date determined is %s %s %s',dt_obj.getDate(),dt_obj.getMonth() + 1,dt_obj.getFullYear());
          //   session.send('Date determined is %s',dtEntity.resolution.values[0].value);
             var dtr_start = dtEntity.resolution.values[0].value;
             var dtr_end = dtEntity.resolution.values[0].value;
         // session.endDialog();
        }
         else
            {
       //   session.send('Date can not be determined');
       //   session.endDialog();
            }
             
    //  console.log(datetimeV2.entity);
    //  session.send('Date is %s',datetimeV2.entity);
    //   session.endDialog();
      //  console.log('Skill iss %s',skillEntity.entity);
        if (skillEntity)  {
            smecontroller.findsmeavaialableforskill(skillEntity ,session,con,dtr_start);
            }
            else{
        if (ResourceEntity)  {
            //   session.send(ResourceEntity.entity); 
             //  session.endDialog();
               sme_name = ResourceEntity.entity;
         } 
       
         smecontroller.find_availibility(sme_name,session,con);
         sme_name="";
        }
            }).triggerAction({
                matches: 'FindAvailability'
            });      
    
    bot.dialog('AddSME', function (session, args) {

             var resourceEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Resource');
             var skillEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'NSkill');            
            if(resourceEntity && skillEntity){
                smecontroller.add_sme(resourceEntity,skillEntity,session,con);
            }
            else{
                session.send('I can not identify the phrase. Can you try any other phrase?') ;
                session.endDialog(); 
            }
             
             
                        }).triggerAction({
                            matches: 'AddSME'
                        });      

// /////////////////////////////////////////////end of my code

// Request file with Authentication Header
var requestWithToken = function (url) {
    return obtainToken().then(function (token) {
        return request({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            }
        });
    });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var checkRequiresToken = function (message) {
    return message.source === 'skype' || message.source === 'msteams';
};

function sendInline(session, filePath, contentType, attachmentFileName) {
    fs.readFile(filePath, function (err, data) {
        if (err) {
            return session.send('Oops. Error reading file.');
        }

        var base64 = Buffer.from(data).toString('base64');

        var msg = new builder.Message(session)
            .addAttachment({
                contentUrl: util.format('data:%s;base64,%s', contentType, base64),
                contentType: contentType,
                name: attachmentFileName
            });

        session.send(msg);
    });
}

//spell check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
bot.use({
botbuilder: function (session, next) {
spellService
.getCorrectedText(session.message.text)
.then(function (text) {
session.message.text = text;
next();
})
.catch(function (error) {
console.error(error);
next();
});
}
});
}
