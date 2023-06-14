const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.one90zt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const usersCollection = client.db("musicSchool").collection("users");
        const classesCollection = client.db("musicSchool").collection("classes");
        const instructorsCollection = client.db("musicSchool").collection("instructors");
        const cartCollection = client.db("musicSchool").collection("carts");
        const paymentCollection = client.db("musicSchool").collection("payments");


        // user related API
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // ------------
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }

            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })


        // 2nd method
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }

            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        // -----------------

        // classes related API
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().sort({student: -1}).toArray();
            res.send(result);
        })

        app.get('/classes/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { instructorEmail: email }
            const result = await classesCollection.find(filter).toArray();
            res.send(result);
        })

        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classesCollection.insertOne(newClass);
            res.send(result);
        })

        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const newFeedback = req.body;
            const updateDoc = {
                $set: {
                    feedback: newFeedback.feedback
                },
            };
            const result = classesCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.put('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateClass = req.body
            const lass = {
                $set: {
                    className: updateClass.className,
                    instructorName: updateClass.instructorName,
                    instructorEmail: updateClass.instructorEmail,
                    price: updateClass.price,
                    availableSets: updateClass.availableSets,
                    image: updateClass.image
                }
            }
            const result = await classesCollection.updateOne(filter, lass, options)
            res.send(result);
        })

        app.get('/dashboard/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await classesCollection.findOne(filter);
            res.send(result);
        })

        app.get('/dashboard/update/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await classesCollection.findOne(filter);
            res.send(result);
        })


        app.patch('/classes/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Approved'
                },
            };
            const result = classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/classes/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Denied'
                },
            };
            const result = classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/updateClass/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const classItem = await classesCollection.findOne(filter);

            const updateDoc = {
                $set: {
                    student: classItem.student + 1,
                    availableSets: classItem.availableSets - 1
                },
            };
            const result = classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // cart collection related API
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })


        // Payment related API----------
        app.get('/dashboard/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.findOne(query);
            res.send(result);
        })
        // ----------------------------

        // Instructors related API
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })

        // create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // store payment in mongodb
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: new ObjectId(payment.cartId) };
            const deleteResult = await cartCollection.deleteOne(query)

            res.send({ insertResult, deleteResult })
        })

        app.get('/payment/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const result = await paymentCollection.find(filter).toArray();
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('music school is running')
})

app.listen(port, () => {
    console.log(`Music school is running on port ${port}`);
})