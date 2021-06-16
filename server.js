const express = require('express')
const { result } = require('lodash')
const { nanoid } = require('nanoid')
const lowdb = require('lowdb')
const moment = require('moment')
const app = express()
const FileSync = require('lowdb/adapters/FileSync')
const menu = new FileSync('./database/menu.json')
const users = new FileSync('./database/users.json')
const db = lowdb(menu)
const userdb = lowdb(users)
const cors = require('cors')
userdb.defaults({ users: [] }).write()

app.use(express.json())
app.use(cors())

// Hämta meny från databasen /api/coffee
app.get('/api/coffee', (req, res) => {
  const menu = db.get('menu').value()
  res.json(menu)
})

// Skapar ett användarkonto /api/account
app.post('/api/account', (req, res) => {
  user = req.body
  const userExist = userdb
    .get('users')
    .find({ username: user.username })
    .value()

  let result = {}

  if (userExist) {
    result.success = false
    result.message = 'An account with that username already exists'
  } else {
    user.id = nanoid()
    user.orders = []
    userdb.get('users').push(user).write()
    result.success = true
    result.message = 'Account successfully created'
  }

  res.json(result)
})

app.get('/api/users', (req, res) => {
  const users = userdb.get('users').value()

  let result = []

  for (let i = 0; i < users.length; i++) {
    result.push({ username: users[i].username, id: users[i].id })
  }

  res.json(result)
})

//	Sparar en kaffebeställning för en användare och returnerar en ETA-tid och ordernummer (båda dessa kan slumpas) till frontend
// /api/order

/**
 * { userId: userId, items: [1, 2, 3] }
 */

app.post('/api/order', (req, res) => {
  // Assign order to req.body
  let order = req.body

  // assign user to order.userID
  let user = userdb.get('users').find({ id: order.userId }).value()

  // initiate var orderTotal
  let orderTotal = 0

  let result = {
    items: []
  }

  // foreach orderitem find the id and price from menu. Add sum to ordertotal
  for (let i = 0; i < order.items.length; i++) {
    const menuItem = db.get('menu').find({ id: order.items[i] }).value()
    orderTotal += menuItem.price
    result.items.push(menuItem.title)
  }

  const wait = Math.floor(Math.random() * 10) + 5 + order.items.length * 2
  result.id = nanoid()
  result.total = orderTotal
  result.date = moment().format('L')
  result.time = moment().format('LT')
  result.eta = moment().add({ hours: 2, minutes: wait })
  user.orders.push(result)

  userdb.get('users').find(user).assign({ orders: user.orders }).write()

  result.success = true
  result.message = 'Order history updated'

  res.json(result)
})

// get order history for user by user ID
app.get('/api/order/history/:userid', (req, res) => {
  const user = userdb.get('users').find({ id: req.params.userid }).value()
  res.json(user.orders)
})

// search for specific order by order ID
app.get('/api/order/search/:orderid', (req, res) => {
  let match = {}
  const users = userdb.get('users').value()
  let result = {
    success: false,
    message: 'No such order.'
  }

  for (let u = 0; u < users.length; u++) {
    const user = users[u]
    for (let i = 0; i < user.orders.length; i++) {
      if (user.orders[i].id === req.params.orderid) {
        match.id = user.orders[i].id
        match.items = user.orders[i].items
        match.orderDate = user.orders[i].date
        match.orderTime = user.orders[i].time
        match.total = user.orders[i].total
        result.success = true
        result.message = 'A matching order has been found!'
        result.order = match
      }
    }
  }
  res.json(result)
})

// Kunna se pågående beställningar och tidigare beställningar
//(man kollar när beställningen lades gentemot vad klockan är nu)
app.get('/api/order/active/:userid', (req, res) => {
  const currentTime = moment().format('LT')
  const currentDate = moment().format('L')
  const user = userdb.get('users').find({ id: req.params.userid }).value()
  const orders = user.orders

  let result = {
    success: false,
    message: 'You have no active orders.'
  }

  for (let i = 0; i < orders.length; i++) {
    if (orders[i].eta > currentTime && orders[i].date >= currentDate) {
      result.success = true
      result.message = 'You have an active order!'
      result.activeOrders = orders[i]
    }
  }
  res.json(result)
})

app.listen(3002, () => {
  console.log('Server is listening on port 3002')
})
