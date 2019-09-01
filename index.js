const db = require('./src/db')
module.exports = {
    init,
    getDb(){
        return global[db.dbSymbol]
    }
}