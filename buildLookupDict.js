var fs = require('fs');
var libxmljs = require("libxmljs");
var hepburn = require("hepburn");
var sqlite3 = require('sqlite3');
var yaml = require('js-yaml');

console.time('readFile');
var jmdict = fs.readFileSync("JMdict");
// var jmdict = fs.readFileSync("example.xml");
console.timeEnd('readFile');

console.time('parse xml');
var xmlDoc = libxmljs.parseXml(jmdict);
console.timeEnd('parse xml');

// var allLanguages = ["ger", "eng", "hun", "spa", "slv", "fre", "dut"];
// var selectedLanguages = ["all"];

var config;
try {
    config = yaml.safeLoad(fs.readFileSync('convert.yml', 'utf8'));
} catch (e) {
    console.log(e);
}
var selectedLanguages = config.SelectedLanguages;// ["ger", "eng"];

var otherLanguages = {}; // name : [occurences]
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
    var ent_seq = entry.get('ent_seq').text();
    var trans_words = entry.find('sense//gloss');
    var kanjis = entry.find('k_ele//keb'); //kanjis
    var kanas = entry.find('r_ele//reb'); //kanas
    for (var k = 0; k < trans_words.length; k++) {
        var attr = trans_words[k].attr("lang");
        if (selectedLanguages == "all" || (!attr || selectedLanguages.indexOf(attr.value()) >= 0)  ) {
            var word = trans_words[k].text();
            addWord(word, otherLanguages, ent_seq);
        }
    }

    for (k = 0; k < kanjis.length; k++) {
        addWord(kanjis[k].text(), japanese, ent_seq);
    }

    for (k = 0; k < kanas.length; k++) {
        var kana = kanas[k].text();
        var romaji = toTitleCase(hepburn.fromKana(kana));
        addWord(kana, japanese, ent_seq);
        addWord(romaji, japanese, ent_seq);
    }

}
console.timeEnd('Build Dictionary');

var db = new sqlite3.Database('lookup.sqlite');
db.serialize(function() {

    // INSERT INTO “android_metadata” VALUES (‘en_US’)

    db.run("DROP TABLE IF EXISTS android_metadata");
    db.run("CREATE TABLE \"android_metadata\" (\"locale\" TEXT DEFAULT 'en_US')");
    db.run("INSERT INTO \"android_metadata\" VALUES ('en_US')");

    db.run("DROP TABLE IF EXISTS lookup");
    db.run("CREATE TABLE lookup (_id INTEGER PRIMARY KEY, text TEXT, ent_seq INTEGER)");

    db.run("BEGIN TRANSACTION");
    console.time('Db inserts');
    var stmt = db.prepare("INSERT INTO lookup VALUES (?, ?, ?)");
    var id = 0;
    for (var prop in all) {

        for (var i = 0; i < all[prop].length; i++) {
            var ent_seq = all[prop][i];
            stmt.run(id,prop, ent_seq);
            id++;
        }

        // stmt.run(prop, all[prop].join(";") );
        // stmt.run("lub");
    }
    stmt.finalize();
    db.run("END");

    console.timeEnd('Db inserts');

});

db.close();



// Pretty Print
// fs.writeFileSync("lookupdict.json", JSON.stringify(otherLanguages, null, 4), 'utf8');
// fs.writeFileSync("japanese_lookupdict.json", JSON.stringify(japanese, null, 4), 'utf8');
// fs.writeFileSync("all_lookupdict.json", JSON.stringify(all, null, 4), 'utf8');

// fs.writeFileSync("lookupdict.json", JSON.stringify(otherLanguages), 'utf8');
// fs.writeFileSync("japanese_lookupdict.json", JSON.stringify(japanese), 'utf8');
// fs.writeFileSync("all_lookupdict.json", JSON.stringify(all), 'utf8');


