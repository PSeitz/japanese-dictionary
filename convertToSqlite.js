
var fs = require('fs');
var _ = require('lodash');
var hepburn = require("hepburn");

var sqlite3 = require('sqlite3');

var json_entries = require("./convertToJson");

var db = new sqlite3.Database('jmdict.sqlite');
db.serialize(function() {

    // INSERT INTO “android_metadata” VALUES (‘en_US’)

    db.run("DROP TABLE IF EXISTS android_metadata");
    db.run("CREATE TABLE \"android_metadata\" (\"locale\" TEXT DEFAULT 'en_US')");
    db.run("INSERT INTO \"android_metadata\" VALUES ('en_US')");

    db.run("DROP TABLE IF EXISTS entries");
    db.run("CREATE TABLE entries (_id INTEGER PRIMARY KEY, TEXT entry)");

    db.run("CREATE TABLE kanjis (_id TEXT PRIMARY KEY)");
    db.run("CREATE TABLE kanas (_id TEXT PRIMARY KEY)");

    db.run("BEGIN TRANSACTION");
    console.time('Db inserts');
    var stmt = db.prepare("INSERT INTO entries VALUES (?, ?)");
    for (var i = 0; i < json_entries.length; i++) {
        var entry = json_entries[i];
        stmt.run(i, JSON.stringify(entry));
    }
    stmt.finalize();
    db.run("END");

    console.timeEnd('Db inserts');

});

db.close();