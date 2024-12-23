# Udaan Lead Tracker

A comprehensive lead tracking system for Udaan's B2B e-commerce platform with lead management, contact tracking, interaction logging, and a dashboard.

## Setup Instructions

1. Make sure you have Node.js installed on your system.
2. Clone this repository to your local machine.
3. Navigate to the project directory in your terminal.
4. Run `npm install` to install the required dependencies.
5. Start the server by running `npm start` or `npm run dev` for development mode with auto-restart.
6. Open your web browser and go to `http://localhost:3000` to access the application.

## Features

- Dashboard with an overview of all leads, today's pending calls, and recent interactions
- Lead Management: Add and view restaurant leads
- Contact Tracking: Add and view contacts for each restaurant
- Basic Interaction Logging: Log and view interactions with restaurants
- Search functionality for leads

## API Endpoints

- GET /api/restaurants - Get all restaurant leads
- POST /api/restaurants - Create a new restaurant lead
- GET /api/restaurants/search - Search for restaurants
- POST /api/contacts - Add a new contact to a restaurant
- GET /api/contacts/:restaurantId - Get contacts for a specific restaurant
- POST /api/interactions - Log a new interaction
- GET /api/interactions/recent - Get recent interactions
- GET /api/interactions/pending-calls - Get today's pending calls
- GET /api/leads - Get all leads with interaction counts

## Database Schema

