var fs = require('fs');


var service = {};



// console.log(entries[100].kanji);
// console.log(entries[100].freq);

// var sqlite3 = require('sqlite3');
// var db = new sqlite3.Database('jmdict.sqlite');

// db.serialize(function() {

//     db.run("BEGIN TRANSACTION");

//     for (var i = 0; i < entries.length; i++) {
//         var entry = entries[i];
//         var argumentos = [entry.kanji];
//         if (!entry.kanji) continue;
//         if (isNaN(entry.freq)) continue;

//         // var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji = '" +entry.kanji+"';";
//         // var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji = '?';";
//         var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji  = ?";
//         // console.log(entry.kanji + " " + entry.freq);

//         db.run(query, argumentos);

//     }
//     db.run("END");


// });
// db.close();

function getEntries(){
    var rows = fs.readFileSync("base_aggregates.txt", 'utf8');
    // console.log(rows);
    rows = rows.split("\n");

    var entries = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var parts = row.split("\t");
        entries.push({
            kanji :parts[1],
            freq :parseInt(parts[0], 10)
        });
    }
    return entries;
}


function addWordFreqToKanji(db){

    var entries = getEntries();

    db.run("BEGIN TRANSACTION");

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var argumentos = [entry.kanji];
        if (!entry.kanji) continue;
        if (isNaN(entry.freq)) continue;
        var query = "UPDATE kanjis SET num_occurences = num_occurences+" +entry.freq+ " WHERE kanji  = ?";
        db.run(query, argumentos);

    }
    db.run("END");
}

service.addWordFreqToKanji = addWordFreqToKanji;
module.exports = service;