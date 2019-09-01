const db = require('./src/db')
module.exports = {
    init: db.init,
    getDb(){
        return global[db.dbSymbol]
    }
}