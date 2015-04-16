var fs = require('fs');
var libxmljs = require("libxmljs");
var hepburn = require("hepburn");
var sqlite3 = require('sqlite3');

console.time('readFile');
var jmdict = fs.readFileSync("JMdict");
// var jmdict = fs.readFileSync("example.xml");
console.timeEnd('readFile');

console.time('parse xml');
var xmlDoc = libxmljs.parseXml(jmdict);
console.timeEnd('parse xml');

var allLanguages = ["ger", "eng", "hun", "spa", "slv", "fre", "dut"];
var selectedLanguages = ["ger", "eng"];

var allLanguages = {}; // name : [occurences]
var japanese = {}; // name : [occurences]
var all = {}; // name : [occurences]
// all entries
var entries = xmlDoc.find('//entry');

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}


function addWord(word, dict, occurence){
    word = word.replace(/ *\([^)]*\) */g, " ");
    word = word.trim();
    word = word.toLowerCase();
    if (!dict[word]){
        dict[word] = [];
    }
    if (dict[word].push) {
        dict[word].push(occurence);
    }

    if (!all[word]){
        all[word] = [];
    }
    if (all[word].push) {
        all[word].push(occurence);
    }

    
}

console.time('Build Dictionary');
for (var entryPos = 0; entryPos < entries.length; entryPos++) {
    var entry = entries[entryPos];

    var trans_words = entry.find('sense//gloss');
    var kanjis = entry.find('k_ele//keb'); //kanjis
    var kanas = entry.find('r_ele//reb'); //kanas
    for (var k = 0; k < trans_words.length; k++) {
        var attr = trans_words[k].attr("lang");
        if (selectedLanguages == "all" || (!attr || selectedLanguages.indexOf(attr.value()) >= 0)  ) {
            var word = trans_words[k].text();
            addWord(word, allLanguages, entryPos);
        }
    }

    for (k = 0; k < kanjis.length; k++) {
        addWord(kanjis[k].text(), japanese, entryPos);
    }

    for (k = 0; k < kanas.length; k++) {
        var kana = kanas[k].text();
        var romaji = toTitleCase(hepburn.fromKana(kana));
        addWord(kana, japanese, entryPos);
        addWord(romaji, japanese, entryPos);
    }

}
console.timeEnd('Build Dictionary');

var db = new sqlite3.Database('lookup.db');
db.serialize(function() {
    db.run("DROP TABLE IF EXISTS lookup");
    db.run("CREATE TABLE lookup (entryname TEXT PRIMARY KEY, occurences TEXT)");

    db.run("BEGIN TRANSACTION");
    console.time('Db inserts');
    var stmt = db.prepare("INSERT INTO lookup VALUES (?, ?)");
    for (var prop in all) {
        stmt.run(prop, "");
        // stmt.run("lub");
    }
    stmt.finalize();
    db.run("END");

    console.timeEnd('Db inserts');

    
    // db.each("SELECT entryname, occurences FROM lookup", function(err, row) {
    //   if (row) console.log(row);
    //   // console.log("row");
    //     // console.log(row.id + ": " + row.info);
    // });
});

db.close();



// Pretty Print
fs.writeFileSync("lookupdict.json", JSON.stringify(allLanguages, null, 4), 'utf8');
fs.writeFileSync("japanese_lookupdict.json", JSON.stringify(japanese, null, 4), 'utf8');
fs.writeFileSync("all_lookupdict.json", JSON.stringify(japanese, null, 4), 'utf8');
// fs.writeFileSync("lookupdict.json", JSON.stringify(allLanguages), 'utf8');
// fs.writeFileSync("japanese_lookupdict.json", JSON.stringify(japanese), 'utf8');

