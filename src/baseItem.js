module.exports = (name, schema) => ({
    $id: name,
    type: 'object',
    properties: Object.assign(
        {
            _id: {
                type: 'string'
            },
            _created: {
                type: 'number'
            },
            _updated: {
                type: 'number'
            },
            _deleted: {
                type: 'number'
            },
            _isDeleted: {
                type: 'boolean'
            }
        },
        schema.properties),
    required: schema.required
})