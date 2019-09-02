#Muffins

> MongoDB collection wrapper with json-schema validation, not fully baked yet

Ingredients:
 - Official mongo driver
 - Json-schema schema definition
 - Schema validation
 - Pagination
 - Automatic UUIDs
 - Soft deletes
 - Document auditing

####Usage

Somewhere in your app, you must init muffins with a config object. This should happen only once and read only the first time the db is used.
```js
require('muffins').init({
    url: "mongodb://localhost/muffins",
    schemas: [{"muffins": {
                  type: 'object',
                  properties: {
                      flavor: {
                          type: { 'enum': [ "blueberry", "lemon poppy seed", "chocolate"] }
                      }
                  },
                  required: [ 'flavor' ]
              }}],
    conn: {
        poolSize: 100
    }
})
```

To use your collections 
```js
const db = require('muffins').db

const getMuffins = async()=> (await db()).muffins.findAll()
```

Muffins config with defaults:
```js
{
    url: "",
    schemaDir: "",
    schemas: [], 
    conn: {
        poolSize: 20,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        reconnectTries: Number.MAX_VALUE,
        bufferMaxEntries: 0,
        socketTimeoutMS: 3000,
        connectTimeoutMS: 10000
    }
}
```
Url and either schemaDir or schemas is required.

Both schemaDir and schemas can be provided.

schemas should be a set of objects with a single property that is the collection name with a value of the schema.

```js
let muffins ={
    "muffins": {
        type: 'object',
        properties: {
            flavor: {
                type: { 'enum': [ "blueberry", "lemon poppy seed", "chocolate"] }
            }
        },
        required: [ 'flavor' ]
    }
}
```

If schema dir is set, muffins will search the directory (not recursively) for js and json files. The default export will be used and the name of the file will be used for the collection name.

You can overwrite any default by setting it. 

You can provide additional settings to the `MongoClient.connect()` call by setting them on `config.conn`.

###db
The object returned by the db method has the following methods
```js
 db = {
    async save( doc, allowUpdateToDeletedRecord = false ){},
    async find( page, pageSize, query, includeDeleted = false ){},
    async patch( patch, allowUpdateToDeletedRecord = false ){},
    async delete(id){},
    async recover(id){},
    mongoCollection
}
```

 - **save**: upsert the document
 - **find**: find pages of documents
 - **patch**: update only specific properties of a document
 - **delete**: perform a soft delete
 - **recover**: undo a soft delete