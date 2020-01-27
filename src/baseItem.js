module.exports = (name, schema) => ({
    $id: name,
    type: 'object',
    properties: Object.assign(
        {
            _id: {
                type: ['object']
            },
            _created: {
                type: ['number', 'null']
            },
            _updated: {
                type: ['number', 'null']
            },
            _deletedDate: {
                type: ['number', 'null']
            },
            _isDeleted: {
                type: 'boolean'
            }
        },
        schema.properties),
    required: schema.required
})