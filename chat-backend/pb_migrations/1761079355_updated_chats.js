/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3861817060")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "participants.id ?= @request.auth.id",
    "listRule": "participants.id ?= @request.auth.id",
    "updateRule": "participants.id ?= @request.auth.id",
    "viewRule": "participants.id ?= @request.auth.id"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation1902735506",
    "maxSelect": 999,
    "minSelect": 2,
    "name": "participants",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text171207866",
    "max": 0,
    "min": 0,
    "name": "lastMessage",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "date2807804200",
    "max": "",
    "min": "",
    "name": "lastMessageTime",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool1691825659",
    "name": "isGroup",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text820519099",
    "max": 0,
    "min": 0,
    "name": "groupName",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "file3419386082",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "groupAvatar",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3861817060")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  // remove field
  collection.fields.removeById("relation1902735506")

  // remove field
  collection.fields.removeById("text171207866")

  // remove field
  collection.fields.removeById("date2807804200")

  // remove field
  collection.fields.removeById("bool1691825659")

  // remove field
  collection.fields.removeById("text820519099")

  // remove field
  collection.fields.removeById("file3419386082")

  return app.save(collection)
})
