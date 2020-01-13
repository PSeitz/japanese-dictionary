var fs = require('fs');


var service = {};

var rows = fs.readFileSync("english_wordfreq.txt", 'utf8');
// console.log(rows);
rows = rows.split("\n");

// var entries = [];

// for (var i = 0; i < 28000; i++) {
//     var row = rows[i];
//     var parts = row.split("\t");
//     entries.push({
//         text :"'"+parts[0]+"'",
//         freq :parseInt(parts[1], 10)
//     });
// }


var entries = {};

for (var i = 0; i < 100000; i++) {
    var row = rows[i];
    var parts = row.split("\t");
    let text = parts[0];
    let freq  = parseInt(parts[1], 10);
    if (freq && !entries[text]) {
        entries[text] = parseInt(Math.log(freq / 10000))
    }
}

fs.writeFileSync("eng_wordfreq.json", JSON.stringify(entries, null, 2))


// console.log(entries[100].kanji);
// console.log(entries[100].freq);

// var sqlite3 = require('sqlite3');
// var db = new sqlite3.Database('jmdict.sqlite');

// db.serialize(function() {

//     db.run("DROP TABLE eng_freq");
//     db.run("CREATE TABLE eng_freq (_id INTEGER PRIMARY KEY, text TEXT NOT NULL, freq INTEGER)");

//     db.run("BEGIN TRANSACTION");

//     for (var i = 0; i < entries.length; i++) {
//         var entry = entries[i];
//         var argumentos = [i, entry.text, entry.freq];
//         if (!entry.text) continue;
//         if (isNaN(entry.freq)) continue;

//         // var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji = '" +entry.kanji+"';";
//         // var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji = '?';";
//         var query =  "INSERT INTO eng_freq (_id, text, freq)" +" VALUES ("+argumentos.join(",")+")";
//         // console.log(query);

//         db.run(query);

//     }
//     db.run("END");


// });



// db.close();