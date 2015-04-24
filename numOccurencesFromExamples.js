var fs = require('fs');
var _ = require('lodash');
// var hepburn = require("hepburn");

console.time('ReadFile');
var examples = fs.readFileSync("examples.utf", "utf8");
console.timeEnd('ReadFile');

console.time('Split');
var examples = examples.split("\n");
console.timeEnd('Split');


console.time('Filter');
examples = _.filter(examples, function(line) {
    return line.indexOf("B:") >= 0;
});
console.timeEnd('Filter');

var numOccurences = {};

for (var i = 0; i < examples.length; i++) {
    examples[i] = examples[i].substring(2, examples[i].length); // remove ( )
    examples[i] = examples[i].replace(/ *\([^)]*\) */g, " "); // remove ( )
    examples[i] = examples[i].replace(/ *\{[^}]*\} */g, " "); // remove { }
    examples[i] = examples[i].replace(/ *\[[^\]]*\] */g, " ");// remove [ ]
    examples[i] = examples[i].trim();
    examples[i] = examples[i].replace(/\s{2,}/g, ' ');// convert all spaces to single spaces
    examples[i] = examples[i].split(" ");

    for (var j = 0; j < examples[i].length; j++) {
        var word = examples[i][j];
        numOccurences[word] = numOccurences[word] ? numOccurences[word]+1 : 1 ;
    }
}

console.log(examples[0]);

// console.log(numOccurences["は"]);
// console.log(numOccurences["今日"]);
// console.log(numOccurences["今日は"]);

var service = {};

service.getMap = function () {
    return numOccurences;
};

module.exports = service;