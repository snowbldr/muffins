const MongoClient = require( 'mongodb' ).MongoClient
const tv4 = new require( 'tv4' )
const fs = require( 'fs' )
const uuid = require( 'uuid/v4' )
const path = require( 'path' )
const baseItem = require( './baseItem' )

/**
 * An error with a suggested http status error code
 */
const DBError = (code, message, errors) => (
    {
        statusCode: code,
        body: {
            errors: errors ? (Array.isArray(errors) ? errors : [errors]).map(e => e.message ? e : {message: e}) : []
        },
        statusMessage: message
    }
)

const findSchemas = ( schemaDir ) => {
    if(!schemaDir) return []
    let fullPath = path.resolve( schemaDir )
    return fs.readdirSync( fullPath, { withFileTypes: true } )
             .filter( f => !f.isDirectory() )
             .filter( f => f.name.endsWith( '.js' ) || f.name.endsWith('.json') )
             .reduce( ( i, f ) => {
                 let name = f.name.split( '.js' )[ 0 ]
                 return Object.assign( i,
                                       { [ name ]: baseItem( name, require( path.join( fullPath, f.name ) ) ) } )
             }, {} )
}

const toggleDelete = ( isDelete, mongoCollection ) => ( _id ) => new Promise( ( resolve, reject ) => {
    if( !_id ) {
        throw DBError( 400, '_id required', 'you must supply an _id to delete' )
    }

    let op = { $set: { _isDeleted: isDelete, _deleted: isDelete ? new Date().getTime() : null } }
    mongoCollection.updateOne( { _id: _id }, op, ( err, r ) => {
        if( err ) {
            reject( err )
        } else {
            r.modifiedCount === 1 ? resolve() : reject( DBError( 404, `${schemaName} not found`, `${schemaName} not found` ) )
        }
    } )
} )

const dbCollection = ( schemaName, validate, mongoCollection ) => ( {
    save: ( newDoc, allowUpdateToDeletedRecord = false ) => new Promise( ( resolve, reject ) => {
        let validation = validate( newDoc )

        if( !newDoc._id ) {
            newDoc._id = uuid()
            newDoc._created = new Date().getTime()
            newDoc._updated = null
            newDoc._isDeleted = false
        } else {
            newDoc._updated = new Date().getTime()
        }

        if( !validation.valid ) {
            throw DBError( 400, 'Request body is invalid', validation.errors.map( e => ( {
                message: e.message,
                prop: e.dataPath.substr( 1 ).replace( '/', '.' )
            } ) ) )
        }

        let query = { _id: newDoc._id }
        if(!allowUpdateToDeletedRecord) {
            query._deleted = false
        }
        mongoCollection.updateOne( query, { $set: newDoc }, { upsert: true }, ( err, res ) => {
            if( err ) {
                reject( err )
            } else {
                res.upsertedCount === 1 || res.modifiedCount ? resolve( newDoc ) : reject( DBError( 404, `${schemaName} not found`, `${schemaName} not found` ) )
            }
        } )
    } ),
    find: ( page, pageSize, query, includeDeleted = false ) => new Promise( ( resolve, reject ) => {
        let limit = pageSize && parseInt( pageSize ) || 10
        let skip = ( page && parseInt( page ) || 0 ) * limit

        let deletedQuery = includeDeleted ? {} : { _isDeleted: false }

        mongoCollection.find( Object.assign( ( query || {} ), deletedQuery ), { limit, skip } ).toArray( ( err, docs ) => {
            err ? reject( err ) : resolve( docs )
        } )
    } ),
    patch: ( patch, allowUpdateToDeletedRecord = false ) => new Promise( ( resolve, reject ) => {
        if( !patch._id ) {
            throw DBError( 400, '_id required', 'You must include an _id field with your patch' )
        }
        let query = { _id: patch._id }
        if(!allowUpdateToDeletedRecord) {
            query._deleted = false
        }
        mongoCollection.findOne( query, ( err, doc ) => {
            let newDoc = Object.assign( {}, doc, patch )
            let validation = validate( newDoc )
            if( !validation.valid ) {
                throw DBError( 400, 'Result of patch is invalid', validation.errors.map( e => ( {
                    message: e.message,
                    params: e.params
                } ) ) )
            }
            newDoc._updated = new Date().getTime()
            mongoCollection.updateOne( query, { $set: newDoc }, ( err, res ) => {
                if( err ) {
                    reject( err )
                } else {
                    res.modifiedCount === 1 ? resolve( newDoc ) : reject( DBError( 404, `${schemaName} not found`, `${schemaName} not found` ) )
                }
            } )
        } )
    } ),
    delete: toggleDelete( true, mongoCollection ),
    recover: toggleDelete( false, mongoCollection ),
    mongoCollection
} )

const toPathStrings = ( next, currPath, paths, depth, filter ) => {
    if( depth === 0 ) return
    if( Array.isArray( next ) ) {
        paths.push( currPath )
        if( next.length > 0 ) {
            for( let i = 0; i < next.length; i++ ) {
                toPathStrings( next[ i ], `${currPath}[${i}]`, paths, depth && depth - 1, filter )
            }
        }
    } else if( next && typeof next === 'object' && filter( next ) ) {
        Object.keys( next )
              .forEach( k => toPathStrings( next[ k ], currPath ? currPath + '.' + k : k, paths, depth && depth - 1, filter ) )
    } else {
        paths.push( currPath )
    }
}

const createIndices = ( props, currPath, collection ) => {
    if( props && typeof props === 'object' ) {
        Object.keys( props )
              .forEach( k => {
                  if( typeof props[ k ].index === "object" ) {
                      collection.createIndex( { [ currPath ? currPath + "." + k : k ]: 1 }, props[k].index)
                  } else {
                      createIndices( props[ k ], currPath ? currPath + '.' + k : k, collection )
                  }
              } )
    }
}

const connect = ()=> new Promise( ( resolve, reject ) => {
    MongoClient.connect( dbConfig.url, dbConfig.conn, ( err, client ) => {
        if( err ) {
            reject( err )
            return
        }
        let mongodb = client.db()
        let db = {}
        let schemas = Array.concat(findSchemas( dbConfig.schemaDir ), dbConfig.schemas)
        if(!schemas){
            throw new Error("You must provide schemas")
        }
        for( let schemaName in schemas ) {
            tv4.addSchema( schemaName, schemas[ schemaName ] )

            let mongoCollection = mongodb.collection( schemaName )

            createIndices( schemas[ schemaName ].properties, null, mongoCollection )

            db[ schemaName ] = dbCollection(
                schemaName,
                ( item ) => tv4.validateMultiple( item, schemaName, true, true ),
                mongoCollection
            )
        }
        if(Object.getOwnPropertySymbols(global).indexOf(dbSymbol) === -1){
            global[dbSymbol] = db
        }
        console.log("muffins ready!")
        resolve( db )
    } )
} )

let dbSymbol = Symbol.for( "muffins.db")
let dbConfig;
module.exports = {
    dbSymbol: dbSymbol,
    async get(){
        if(!dbConfig) throw "you must init muffins with the config before getting the db"
        return global[dbSymbol] ? global[dbSymbol] : connect()
    },
    init: ( config ) => {
        dbConfig = config
        dbConfig.conn = Object.assign(
            {
                poolSize: 20,
                useNewUrlParser: true,
                useUnifiedTopology: true,
                reconnectTries: Number.MAX_VALUE,
                bufferMaxEntries: 0,
                socketTimeoutMS: 3000,
                connectTimeoutMS: 10000
            },
            config.conn
        )
    }
}