const express = require('express');
const Sequelize = require('sequelize');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({ secret: "mysession", resave: false, saveUninitialized: true }));
app.use(cors());

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    storage: './Database/SanitarywareDB.sqlite'
});

const user = sequelize.define("user", {
    userid: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: Sequelize.STRING },
    password: { type: Sequelize.STRING },
    name: { type: Sequelize.STRING },
    phone: { type: Sequelize.STRING },
    address: { type: Sequelize.STRING },
    role: { type: Sequelize.STRING, defaultValue: 'user' }
});

const newproduct = sequelize.define("newproduct", {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING },
    typeId: { type: Sequelize.STRING },
    price: { type: Sequelize.STRING },
    image: { type: Sequelize.STRING }
});

const basket = sequelize.define("basket", {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING },
    price: { type: Sequelize.STRING },
    qty: { type: Sequelize.STRING },
    userid: { type: Sequelize.INTEGER },
    productid: { type: Sequelize.INTEGER },
});

const ordersProcess = sequelize.define("ordersProcess",{
    orderid: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    userid: { type: Sequelize.INTEGER },
    productid: { type: Sequelize.INTEGER },
    paymenttype: { type: Sequelize.BOOLEAN },
    createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
});

const PaymentOrder = sequelize.define("PaymentOrder", {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: Sequelize.INTEGER },
    orderId: { type: Sequelize.INTEGER },
    totalAmount: { type: Sequelize.FLOAT },
    senderName: { type: Sequelize.STRING },
    senderAddress: { type: Sequelize.STRING },
    senderPhone: { type: Sequelize.STRING },
    receiverName: { type: Sequelize.STRING },
    receiverAddress: { type: Sequelize.STRING },
    receiverPhone: { type: Sequelize.STRING },
    productid: { type: Sequelize.STRING }
});

const PaymentOrderHistory = sequelize.define("PaymentOrderHistory", {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    paymentOrderId: { type: Sequelize.INTEGER },
    status: { type: Sequelize.STRING }
});

PaymentOrder.hasMany(PaymentOrderHistory, { foreignKey: 'paymentOrderId' });
PaymentOrderHistory.belongsTo(PaymentOrder, { foreignKey: 'paymentOrderId' });
PaymentOrder.belongsTo(newproduct, { foreignKey: 'productId' });

sequelize.sync();

// Login 
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const getUser = await user.findOne({ where: { username, password } });

        if (!getUser) {
            return res.status(401).json({ status: "error", message: "Invalid username or password" });
        }

        res.status(200).json({ status: "success", message: "Login successful", data: { userID: getUser.userid, userName: getUser.username } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});

app.get('/Listproducts', async (req, res) => {
    try {
        const products = await newproduct.findAll();
        res.json(products);
    } catch (error) {
        console.error('Error retrieving products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/basket', async (req, res) => {
    try {
        const basketItems = await basket.findAll();
        res.json(basketItems);
    } catch (error) {
        console.error('Error retrieving basket items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/insertbasket', async (req, res) => {
    try {
        const { name, price, qty, userid, productid } = req.body;
        const newBasketItem = await basket.create({ name, price, qty, userid, productid });
        res.status(201).json(newBasketItem);
    } catch (error) {
        console.error('Error inserting item into basket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/basket/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const basketItem = await basket.findByPk(id);
        if (!basketItem) {
            return res.status(404).json({ error: 'Basket item not found' });
        }
        await basketItem.destroy();
        res.json({ status: 200, success: true });
    } catch (error) {
        console.error('Error deleting basket item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const newOrder = await ordersProcess.create(req.body);
        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Error inserting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

ordersProcess.belongsTo(newproduct, { foreignKey: 'productid' });
newproduct.hasMany(ordersProcess, { foreignKey: 'productid' });

app.get('/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const orderWithProduct = await ordersProcess.findByPk(id, { include: [newproduct] });
        if (!orderWithProduct) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(orderWithProduct);
    } catch (error) {
        console.error('Error retrieving order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const order = await orders.findByPk(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        await order.destroy();
        res.status(204).end();
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/paymentorders', async (req, res) => {
    try {
        const orders = req.body;

        const createdOrders = await Promise.all(orders.map(async order => {
            const { userId, totalAmount, senderName, senderAddress, senderPhone, receiverName, receiverAddress, receiverPhone, productid } = order;

            const paymentOrder = await PaymentOrder.create({ userId, totalAmount, senderName, senderAddress, senderPhone, receiverName, receiverAddress, receiverPhone , productid });

            await PaymentOrderHistory.create({ paymentOrderId: paymentOrder.id, status: 'success' });

            return paymentOrder;
        }));

        res.status(201).json(createdOrders);
    } catch (error) {
        console.error('Error creating PaymentOrder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/paymentorderhistory', async (req, res) => {
    try {
        const OrderHistory = await PaymentOrderHistory.findAll();
        if (!OrderHistory) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(OrderHistory);
    } catch (error) {
        console.error('Error retrieving order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/getdatahistory', async (req, res) => {
    try {
        const historyData = await PaymentOrderHistory.findAll({
            include: [
                {
                    model: PaymentOrder,
                    include: [newproduct]
                }
            ]
        });

        if (!historyData) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.json(historyData);
    } catch (error) {
        console.error('Error retrieving history data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post("/register", async (req, res) => {
    user.create(req.body)
        .then((user) => {
            res.send(user);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
