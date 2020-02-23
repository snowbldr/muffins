const db = require( './src/db' )
const {ObjectId} = require('mongodb')
module.exports = {
    init: db.init,
    db: db.get,
    newId: ()=>new ObjectId().toString(),
    withDb( fun ) {
        return async function() {
            return fun( await db.get(), ...arguments )
        }
    }
}