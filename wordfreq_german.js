var fs = require('fs');

var iconvlite = require('iconv-lite');
var fs = require('fs');

function readFileSync_encoding(filename, encoding) {
    var content = fs.readFileSync(filename);
    return iconvlite.decode(content, encoding);
}

var service = {};

var rows = readFileSync_encoding("derewo-v-ww-bll-320000g-2012-12-31-1.0.txt", 'ISO-8859-15');
// console.log(rows);
rows = rows.split("\n");

var entries = {};

for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var parts = row.split(" ");
    let text = parts[0];
    let freq  = parseInt(parts[1], 10);
    if (freq && !entries[text]) {
        entries[text] = parseInt(65 / freq)
    }
}

fs.writeFileSync("deu_wordfreq.json", JSON.stringify(entries, null, 2))

// console.log(entries[100].kanji);
// console.log(entries[100].freq);

// var sqlite3 = require('sqlite3');
// var db = new sqlite3.Database('jmdict.sqlite');

// db.serialize(function() {

//     db.run("DROP TABLE germ_freq");
//     db.run("CREATE TABLE germ_freq (_id INTEGER PRIMARY KEY, text TEXT NOT NULL, freq INTEGER)");

//     db.run("BEGIN TRANSACTION");

//     for (var i = 0; i < entries.length; i++) {
//         var entry = "'"+entries[i]+"'";
//         var argumentos = [i, entry.text, entry.freq];
//         if (!entry.text) continue;
//         if (isNaN(entry.freq)) continue;

//         // var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji = '" +entry.kanji+"';";
//         // var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji = '?';";
//         var query =  "INSERT INTO germ_freq (_id, text, freq)" +" VALUES ("+argumentos.join(",")+")";

//         db.run(query);

//     }
//     db.run("END");


// });



// db.close();