const db = require('./src/db')
module.exports = {
    init: db.init,
    db: db.get
}