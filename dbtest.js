var fs = require('fs');

var sqlite3 = require('sqlite3');


var db = new sqlite3.Database('lookup.db');
db.serialize(function() {


    

	db.each("SELECT * FROM android_metadata", function(err, row) {
	  if (row) console.log(row);
	  // console.log("row");
	    // console.log(row.id + ": " + row.info);
	});


	db.each("SELECT _id, occurences FROM lookup WHERE _id LIKE '%rot%fuji%'", function(err, row) {
	  if (row) console.log(row);
	  // console.log("row");
	    // console.log(row.id + ": " + row.info);
	});

	db.each("SELECT _id, occurences FROM lookup WHERE _id LIKE '%morgen%'", function(err, row) {
	  if (row) console.log(row);
	  // console.log("row");
	    // console.log(row.id + ": " + row.info);
	});

});

db.close();

