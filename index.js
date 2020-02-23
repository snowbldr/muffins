const db = require( './src/db' )
module.exports = {
    init: db.init,
    db: db.get,
    withDb( fun ) {
        return async function() {
            return fun( await db.get(), ...arguments )
        }
    }
}