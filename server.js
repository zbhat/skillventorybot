var mssql = require('mssql');
/*function createConnection() {
  var con = mysql.createConnection({
    //host: "swinarbstools01.noid.in.sopra",
    host: "localhost",
    user: "root",
    password: "password",
    database: "skillventory"
  });
  return con;
}*/
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

// Create connection to database

var config = 
   {
     userName: 'zahi', // update me
     password: 'Whoknows9797', // update me
     server: 'skillventory.database.windows.net', // update me
     options: 
        {
           database: 'skillventory' //update me
           , encrypt: true
        }
   }
   exports.getConfig = function getConfig(skillEntity,session,con){
     return config;
   }
var connection = new Connection(config);
function createConnection() {
// Attempt to connect and execute queries if connection goes through

connection.on('connect', function(err) 
   {
     if (err) 
       {
          console.log(err)
       }
    else
       {
         var data = queryDatabase();
         console.log('quering database for '+data);
       }
   }
 );

function queryDatabase()
   { console.log('Reading rows from the Table...');
 var data;
     request = new Request(
          "SELECT * FROM sme1",
             function(err, recordset) 
                {
                    console.log(recordset + ' row(s) returned');
                    connection.close();
                    console.log('quering database for '+data);
                }
            );
     request.on('row', function(columns) {
      data=columns[0].value;
        columns.forEach(function(column) {
            console.log("%s\t%s", column.metadata.colName, column.value);
         });
             });
     connection.execSql(request);
   }
  }

module.exports.createConnection = createConnection;