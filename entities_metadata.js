var fs = require('fs');
var _ = require('lodash');
var service = {};

var entities = fs.readFileSync("entities.xml", 'utf8');
entities = entities.split("\n");
entities = _.map(entities, function(value){
    var short = value.substring(9, value.indexOf("\"")).trim();
    var long = value.substring(value.indexOf("\"")+1, value.length-2).trim();
    return {short:short, long:long};
});

var entitiesMap = {};
for (var i = 0; i < entities.length; i++) {
    var entityMapping = entities[i];
    // entitiesMap[entityMapping.short] = entityMapping.long;
    // entitiesMap[entityMapping.long] = entityMapping.short;
    entitiesMap[entityMapping.long] = i;
}

service.getEntitiesMap = function(){
    return entitiesMap;
}

// var indexMapLong = _.map(entities, "long");
// console.log(indexMapLong);

service.getEntitiesLongByIndex = function(index){
    return entities[index].long;
}

service.getEntityIndexWithLong = function(longVersion){
    return entitiesMap[longVersion];
}

module.exports = service;