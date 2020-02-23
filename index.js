const db = require( './src/db' )
module.exports = {
    init: db.init,
    db: db.get,
    async withDb( fun ) {
        return async function() {
            return fun( await db.get(), ...arguments )
        }
    }
}