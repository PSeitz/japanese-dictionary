// var fs = require('fs');
var _ = require('lodash');
// var hepburn = require("hepburn");

var sqlite3 = require('sqlite3');

var data = require("./convertToJson");

var db = new sqlite3.Database('jmdict.sqlite');
db.serialize(function() {

    // INSERT INTO “android_metadata” VALUES (‘en_US’)

    db.run("DROP TABLE IF EXISTS android_metadata");
    db.run("CREATE TABLE \"android_metadata\" (\"locale\" TEXT DEFAULT 'en_US')");
    db.run("INSERT INTO \"android_metadata\" VALUES ('en_US')");

    db.run("DROP TABLE IF EXISTS entries");
    db.run("DROP TABLE IF EXISTS kanjis");
    db.run("DROP TABLE IF EXISTS kanas");
    db.run("DROP TABLE IF EXISTS meanings");
    db.run("DROP TABLE IF EXISTS languages");

    db.run("CREATE TABLE kanjis (_id INTEGER PRIMARY KEY, kanji TEXT NOT NULL, ent_seq INTEGER)");
    db.run("CREATE TABLE kanas (_id INTEGER PRIMARY KEY, kana TEXT NOT NULL, ent_seq INTEGER, romaji TEXT NOT NULL)");
    db.run("CREATE TABLE languages (_id INTEGER PRIMARY KEY, lang TEXT NOT NULL UNIQUE)");
    db.run("CREATE TABLE meanings (_id INTEGER PRIMARY KEY, meaning TEXT, lang INTEGER, ent_seq INTEGER, FOREIGN KEY(lang) REFERENCES languages(_id) )");
    // db.run("CREATE TABLE entries (_id INTEGER PRIMARY KEY, ent_seq INTEGER, meaning lang, kanji  FOREIGN KEY(trackartist) REFERENCES artist(artistid))");

    console.time('Db inserts');

    console.log("kanjis");
    insert({ table: "kanjis", data: data.getAllKanji(), properties: ["text", "ent_seq"]});
    console.log("kanas");
    insert({ table: "kanas", data: data.getAllKana(), properties: ["text", "ent_seq", "romaji"] });
    console.log("languages");

    insert({ table: "languages", data: data.getAllLanguages()});
    console.log("meanings");
    insert({
        table: "meanings",
        data: data.getAllMeanings(),
        properties: ["text", "lang", "ent_seq"],
        fk: {
            "lang": {
                table: "languages",
                field: "_id",
                value: "lang"
            }
        }
    });

    db.run("CREATE INDEX kana_index ON kanas(kana)");
    db.run("CREATE INDEX kanji_index ON kanjis(kanji)");

    console.timeEnd('Db inserts');

});


function insert(options){
    var data = options.data;

    db.run("BEGIN TRANSACTION");
    console.time('Db inserts');
    // properties

    var databinding = Array(2);

    // var questionmarks = " ?, ? ";
    if (options.properties) {
        databinding = Array(options.properties.length + 1);
    }
    _.fill(databinding, '?');

    // stmt = db.prepare( "INSERT INTO "+options.table+" VALUES ("+questionmarks+")");
    for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        var argumentos = [i];
        if (options.properties) {
            for (var k = 0; k < options.properties.length; k++) {
                var property = options.properties[k];
                if (options.fk && options.fk[property]) {
                    var value = entry[property];
                    value = value.replace(/'/g, "''");
                    var select = "(SELECT "+options.fk[property].field+" from "+options.fk[property].table+" WHERE "+options.fk[property].value+"='"+value+"')";
                    databinding[k+1] = select;
                }else{
                    argumentos.push(entry[property]);
                }
            } 
        }else{
            argumentos.push(entry);
        }
        
        db.run("INSERT INTO "+options.table+" VALUES ("+databinding.join(",")+")", argumentos);

        // stmt.run.apply(stmt, argumentos);
    }
    // stmt.finalize();
    db.run("END");

    console.timeEnd('Db inserts');
}

db.close();