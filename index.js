const db = require('./src/db')
module.exports = {
    init: db.init,
    db(){
        return global[db.dbSymbol]
    }
}