require('dotenv').config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

const MongoClient = require("mongodb").MongoClient;
const atlasURI = `mongodb://admin:${mongodb_password}@ac-beq3xfz-shard-00-00.9rwfzad.mongodb.net:27017,ac-beq3xfz-shard-00-01.9rwfzad.mongodb.net:27017,ac-beq3xfz-shard-00-02.9rwfzad.mongodb.net:27017/?ssl=true&replicaSet=atlas-gbap5y-shard-0&authSource=admin&appName=Cluster0`;
console.log("URI:", atlasURI);  // moved here
var database = new MongoClient(atlasURI, {});
module.exports = {database};