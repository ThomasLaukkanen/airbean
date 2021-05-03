const express = require('express');
const { result } = require('lodash');
const { nanoid } = require('nanoid');
const lowdb = require('lowdb');
const moment = require('moment');
const app = express();
const FileSync = require('lowdb/adapters/FileSync');
const menu = new FileSync('./database/menu.json');
const users = new FileSync('./database/users.json');
const db = lowdb(menu);
const userdb = lowdb(users);
userdb.defaults({ users: [] }).write();

app.use(express.json());

// Hämta meny från databasen /api/coffee
app.get('/api/coffee', (req, res) => {
	const menu = db.get('menu').value();
	res.json(menu);
});

// Skapar ett användarkonto /api/account
app.post('/api/account', (req, res) => {
	user = req.body;
	const userExist = userdb
		.get('users')
		.find({ username: user.username })
		.value();

	let result = {};

	if (userExist) {
		// Körs om users inte är tom och det finns en matchning
		result.success = false;
		result.message = 'An account with that username already exists';
	} else {
		// Körs om users inte är tom och det inte finns en matchning
		user.id = nanoid();
		user.orders = [];
		userdb.get('users').push(user).write();
		result.success = true;
		result.message = 'Account successfully created';
	}

	res.json(result);
});

//Sparar en kaffebeställning för en användare och returnerar en  ETA-tid och ordernummer (båda dessa kan slumpas) till frontend
// /api/order

app.post('/api/order', (req, res) => {
	// Assign order to req.body
	let order = req.body;

	// assign user to order.userID
	let user = userdb.get('users').find({ id: order.userId }).value();

	// initiate var orderTotal
	let orderTotal = 0;

	// foreach orderitem find the id and price from menu. Add sum to ordertotal
	for (let i = 0; i < order.items.length; i++) {
		const menuItem = db.get('menu').find({ id: order.items[i] }).value();
		orderTotal += menuItem.price;
	}

	let result = {};

	const wait = Math.floor(Math.random() * 10) + 5 + order.items.length * 2;
	order.id = nanoid();
	order.total = orderTotal;
	order.date = moment().format('L');
	order.time = moment().format('LT');
	order.eta = moment().add(wait, 'minutes').format('LT');
	user.orders.push(order);

	userdb.get('users').find(user).assign({ orders: user.orders }).write();

	result.success = true;
	result.message = 'Order history updated';

	res.json(result);
});

// get order history for user by user ID
app.get('/api/order/history/:userid', (req, res) => {
	const user = userdb.get('users').find({ id: req.params.userid }).value();
	console.log(user.orders);
	res.json(user.orders);
});

// search for specific order by order ID
app.get('/api/order/search/:orderid', (req, res) => {
	let orderId; //= req.params.orderid;
	const users = userdb.get('users').value();

	let result = {
		success: false,
		message: 'No such order.'
	};

	for (let u = 0; u < users.length; u++) {
		const user = users[u];
		for (let i = 0; i < user.orders.length; i++) {
			if (user.orders[i].id === req.params.orderid) {
				orderId = user.orders[u].id;
				result.success = true;
				result.message = 'A matching order has been found!';
				result.order = orderId;
			}
		}
	}
	res.json(result);
	// console.log(orderId);
});

// Kunna se pågående beställningar och tidigare beställningar
//(man kollar när beställningen lades gentemot vad klockan är nu)
app.get('/api/order/active/:userid', (req, res) => {
	const currentTime = moment().format('LT');
	const currentDate = moment().format('L');
	console.log(currentTime);
	// const userid = req.params.userid;
	const user = userdb.get('users').find({ id: req.params.userid }).value();
	const orders = user.orders;
	console.log(orders);
	// let activeOrder = false;

	let result = {
		success: false,
		message: 'You have no active orders.'
	};

	for (let i = 0; i < orders.length; i++) {
		if (orders[i].eta > currentTime && orders[i].date >= currentDate) {
			// activeOrder = true;
			result.success = true;
			result.message = 'You have an active order!';
			result.activeOrders = orders[i];
		}
	}

	res.json(result);

	/*if (currentTime > orders.time && currentTime < order.eta) {
    result.success = true;
    result.message = `Your active order is: ${}`
  } else {
    result.success = false;
    result.message = "There is currently no active order."
  }*/
});

app.listen(3000, () => {
	console.log('Server is listening on port 3000');
});
