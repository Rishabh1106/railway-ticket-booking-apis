const express = require('express');
const dotenv = require('dotenv');
const app = express();
const ticketRoutes = require('./routes/ticketRoutes')

dotenv.config();
app.use(express.json())

// Import and use routes
app.use('/api/v1/', ticketRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
