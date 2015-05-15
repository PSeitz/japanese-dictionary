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
    db.run("DROP TABLE IF EXISTS kana_conjugations");
    db.run("DROP TABLE IF EXISTS kanji_conjugations");
    db.run("DROP TABLE IF EXISTS kanji_readings");

    db.run("CREATE TABLE languages (_id INTEGER PRIMARY KEY, lang TEXT NOT NULL UNIQUE)");

    db.run("CREATE TABLE kanji_readings (_id INTEGER PRIMARY KEY, kanji_id INTEGER NOT NULL, kana_id INTEGER NOT NULL)");

    db.run("CREATE TABLE kana_conjugations (_id INTEGER PRIMARY KEY, kana_id INTEGER NOT NULL, form TEXT NOT NULL)");
    db.run("CREATE TABLE kanji_conjugations (_id INTEGER PRIMARY KEY, kanji_id INTEGER NOT NULL, form TEXT NOT NULL)");

    db.run("CREATE TABLE kanjis (_id INTEGER PRIMARY KEY, kanji TEXT NOT NULL, ent_seq INTEGER, commonness INTEGER, num_occurences INTEGER)");
    db.run("CREATE TABLE kanas (_id INTEGER PRIMARY KEY, kana TEXT NOT NULL, ent_seq INTEGER, romaji TEXT NOT NULL, commonness INTEGER, num_occurences INTEGER)");
    // db.run("CREATE VIRTUAL TABLE meanings USING fts3(_id INTEGER PRIMARY KEY, meaning TEXT, lang INTEGER, ent_seq INTEGER, FOREIGN KEY(lang) REFERENCES languages(_id) )");
    // db.run("CREATE TABLE entries (_id INTEGER PRIMARY KEY, ent_seq INTEGER, meaning lang, kanji  FOREIGN KEY(trackartist) REFERENCES artist(artistid))");
    db.run("CREATE TABLE meanings (_id INTEGER PRIMARY KEY, meaning TEXT, lang INTEGER, ent_seq INTEGER, FOREIGN KEY(lang) REFERENCES languages(_id) )");

    console.time('Db inserts');

    console.log("kanjis");
    insert(db, { table: "kanjis", data: data.getAllKanji(), properties: ["text", "ent_seq", "commonness", "num_occurences"]});
    console.log("kanas");
    insert(db, { table: "kanas", data: data.getAllKana(), properties: ["text", "ent_seq", "romaji", "commonness", "num_occurences"] });
    console.log("languages");

    insert(db, { table: "languages", data: data.getAllLanguages()});
    console.log("meanings");
    insert(db, {
        table: "meanings",
        tablefields: ["_id", "meaning", "lang", "ent_seq"],
        data: data.getAllMeanings({removeParentheses: true}),
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
    db.run("CREATE INDEX meaning_index ON meanings(meaning)");

    db.run("CREATE INDEX kana_ent_seqs ON kanas(ent_seq)");
    db.run("CREATE INDEX kanji_ent_seqs ON kanjis(ent_seq)");
    db.run("CREATE INDEX meaning_ent_seqs ON meanings(ent_seq)");

    insert(db, {
        table: "kanji_conjugations",
        tablefields: ["_id", "kanji_id", "form"],
        data: data.getAllKanjiWithConjugations(),
        properties: ["stem", "form"],
        fk: {
            "stem": {
                table: "kanjis",
                field: "_id",
                value: "kanji"
            }
        }
    });
    

    insert(db, {
        table: "kana_conjugations",
        tablefields: ["_id", "kana_id", "form"],
        data: data.getAllKanaWithConjugations(),
        properties: ["stem", "form"],
        fk: {
            "stem": {
                table: "kanas",
                field: "_id",
                value: "kana"
            }
        }
    });


    // insert(db, {
    //     table: "kanji_readings",
    //     tablefields: ["_id", "kanji_id", "kana_id"],
    //     data: data.getKanjiReadings(),
    //     properties: ["kanji", "reading"],
    //     fk: {
    //         "kanji": {
    //             table: "kanjis",
    //             field: "_id",
    //             values: ["ent_seq", "kanji"]
    //         },
    //         "reading": {
    //             table: "kanas",
    //             field: "_id",
    //             values: ["ent_seq", "reading"]
    //         }
    //     }
    // });
    var tablefields =  ["_id", "kanji_id", "kana_id"];
    var readings = data.getKanjiReadings();
    db.run("BEGIN TRANSACTION");
    for (var i = 0; i < readings.length; i++) {
        var reading = readings[i];
        var argumentos = Array(3);
        argumentos[0] = i;
        argumentos[1] = "(SELECT _id from kanjis WHERE kanji='"+reading.kanji+"' AND ent_seq='"+reading.ent_seq+"')";
        argumentos[2] = "(SELECT _id from kanas WHERE kana='"+reading.reading+"' AND ent_seq='"+reading.ent_seq+"')";
        var query = "INSERT INTO kanji_readings ("+tablefields.join(",")+")" +" VALUES ("+argumentos.join(",")+")";
        db.run(query);
        
    }
    
    db.run("END");

    db.run("CREATE INDEX kanji_readings_ix ON kanji_readings(kanji_id)");

    db.run("CREATE INDEX kana_conjugations_ix ON kana_conjugations(form)");
    db.run("CREATE INDEX kanji_conjugations_ix ON kanji_conjugations(form)");

    console.timeEnd('Db inserts');

});



function insert(db, options){
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
        
        // (_id, meaning, lang, ent_seq )
        var query;
        if (options.tablefields) query = "INSERT INTO "+options.table + "("+options.tablefields.join(",")+")" +" VALUES ("+databinding.join(",")+")";
        else query = "INSERT INTO "+options.table +" VALUES ("+databinding.join(",")+")";
        db.run(query, argumentos);

        // stmt.run.apply(stmt, argumentos);
    }
    // stmt.finalize();
    db.run("END");

    console.timeEnd('Db inserts');
}

db.close();