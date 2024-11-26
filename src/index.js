const User = require('./models/User');
const Colleague = require('./models/Colleague');


const express = require('express');
const app = express();
const PORT = 3000;
const path = require('path');

const connectDB = require('./db');
connectDB();


// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Route for the Thank You page
app.get('/thankyou', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/thankyou.html'));
});

// Middleware to parse JSON requests
app.use(express.json());

// In-memory storage for colleagues (temporary)
let users = [];  // In-memory storage for simplicity
let userIdCounter = 1;  // To create unique IDs for users


// Route to create a new user
app.post('/user', async (req, res) => {
    const { name, email } = req.body;

    // Validate the input
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required!' });
    }

    try {
        // Create a new User document
        const newUser = new User({
            name,
            email
        });

        // Save the user to the database
        await newUser.save();

        res.status(201).json({ message: 'User created successfully', userId: newUser._id });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Route: Serve Farewell Form (GET request)
// Route: Serve Farewell Form (GET request)
app.get('/view/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch the user from the MongoDB database
        const user = await User.findById(userId);

        // Check if the user exists
        if (!user) {
            return res.status(404).send('User not found!');
        }

        // Serve the HTML page with the form
        res.sendFile(path.join(__dirname, '../public/viewmessage.html'));
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).send('Internal Server Error');
    }
});


// Route: View Farewell Message (POST request)
app.post('/view/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, code } = req.body;

        // Validate the request
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and Code are required!' });
        }

        // Query MongoDB for a colleague with the given userId, email, and code
        const colleague = await Colleague.findOne({ 
            userId, 
            email, 
            code 
        });

        if (!colleague) {
            return res.status(404).json({ error: 'Invalid email or code!' });
        }

        // Return the farewell message
        res.status(200).json({ 
            message: 'Farewell message retrieved successfully!', 
            farewellMessage: colleague.message 
        });
    } catch (error) {
        console.error('Error retrieving farewell message:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




// Route: Add Colleague

// Route to serve Add Colleagues Page
app.get('/add-colleagues/:userId', async (req, res) => {
    const { userId } = req.params;

    // Check if the user exists in the database
    try {
        const user = await User.findById(userId);  // Use Mongoose to find the user by ID

        if (!user) {
            return res.status(404).send('User not found!');
        }

        // Serve the Add Colleagues page if the user is found
        res.sendFile(path.join(__dirname, '../public/add-colleagues.html'));
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Server error');
    }
});

app.post('/user/:userId/colleagues', async (req, res) => {
    const { userId } = req.params;
    const { name, email, message, code } = req.body;

    if (!name || !email || !message || !code) {
        return res.status(400).json({ error: 'Name, Email, Message, and Code are required!' });
    }

    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        // Create a new Colleague document
        const newColleague = new Colleague({
            userId,
            name,
            email,
            message,
            code
        });

        // Save the colleague to the database
        await newColleague.save();

        res.status(201).json({ message: 'Colleague added successfully', colleague: newColleague });
    } catch (error) {
        console.error('Error adding colleague:', error);
        res.status(500).json({ error: 'Failed to add colleague' });
    }
});


// Route to finalize the colleagues list and send emails
// Route: Finalize Colleagues List and Send Emails
app.post('/user/:userId/finalize', async (req, res) => {    
    const { userId } = req.params;
    const user = await User.findById(userId);  // Make sure you're querying the 'users' collection
    if (!user) {
        return res.status(404).json({ error: 'User not found!' });
    }

    try {
        // Find colleagues associated with the userId
        const userColleagues = await Colleague.find({ userId });

        if (userColleagues.length === 0) {
            return res.status(400).json({ error: 'No colleagues to finalize!' });
        }

        // Generate the unique URL for the user (assuming the URL is based on the userId)
        const userUrl = `http://localhost:3000/view/${userId}`;

        // Send farewell emails to each colleague
        userColleagues.forEach(colleague => {
            sendFarewellEmail(colleague.email, colleague.name, colleague.code, userUrl, user);  // Pass 'user' as newUser
        });

        res.status(200).json({ message: 'Colleagues finalized and emails sent!' });
    } catch (error) {
        console.error('Error finalizing colleagues:', error);
        res.status(500).json({ error: 'Failed to finalize colleagues' });
    }
});




// Route: Get All Colleagues (for testing)
app.get('/colleagues', (req, res) => {
    res.json({ colleagues });
});

// Route: Generate Shareable Link
app.post('/generate-link', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required!' });
    }

    try {
        // Find the user in the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        // Generate a unique shareable link for the user
        const shareableLink = `http://localhost:3000/view/${userId}`;

        // Save the shareable link to the user's record
        user.shareableLink = shareableLink;
        await user.save();

        // Return the generated link in the response
        res.status(200).json({ message: 'Shareable link generated successfully!', link: shareableLink });
    } catch (error) {
        console.error('Error generating shareable link:', error);
        res.status(500).json({ error: 'Failed to generate shareable link' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const nodemailer = require('nodemailer');

// Create a transporter object using SMTP (Gmail example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'saluja.mohit2204@gmail.com', // Replace with your email
        pass: 'pqxnmogrcccmalli' // Replace with your email password (or app-specific password)
    }
});

// Send email function
const sendFarewellEmail = (email, name, code, userUrl, newUser) => {
    const mailOptions = {
        from: 'your-email@gmail.com',  // Sender address
        to: email,                    // Recipient address
        subject: `A Special Farewell Message Just for You!`, // Subject
        text: `Dear ${name},\n\nA heartfelt farewell message has been crafted just for you by ${newUser.name}. This isn't just any message — it’s a personal, thoughtful note filled with memories and well-wishes. \n\nTo view this special message, use the unique code below:\n\n**${code}**\n\nYou can access your message here: ${userUrl}\n\nTake a moment to read the message, as it’s a token of appreciation from ${newUser.name} who has put in a lot of effort to make this moment memorable for you. \n\nWishing you all the best,\nThe Farewell Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

