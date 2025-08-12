# OpenAI Greeting Feature Setup

## Overview
The greeting card feature uses OpenAI's GPT-3.5-turbo to generate personalized, aviation-themed greetings for different user roles.

## Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Features

### Role-Specific Greetings
- **PILOT**: Motivational greetings acknowledging experience and encouraging flying activities
- **STUDENT**: Supportive messages for learning journey and progress
- **INSTRUCTOR**: Professional greetings acknowledging their role in training
- **PROSPECT**: Inspiring messages encouraging first steps in aviation

### Time-Based Context
- **Morning**: Energetic greetings to start the day
- **Afternoon**: Productive messages for ongoing activities
- **Evening**: Reflective messages for end-of-day

### Fallback System
- If OpenAI API is not configured, the system provides default aviation-themed greetings
- If API calls fail, graceful fallback to default messages
- No interruption to user experience

## API Endpoint

### POST /api/greeting
Generates personalized greetings using OpenAI.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "role": "PILOT",
  "timeOfDay": "morning"
}
```

**Response:**
```json
{
  "greeting": {
    "greeting": "Good morning, John!",
    "message": "Ready to soar through the skies today, Captain?",
    "icon": "plane",
    "mood": "energetic"
  }
}
```

## Components

### GreetingCard
- Displays personalized greetings with gradient backgrounds
- Shows user role badge
- Includes refresh button for new greetings
- Responsive design with mood-based colors

### Integration
- Automatically appears for PILOT, STUDENT, INSTRUCTOR, and PROSPECT users
- Positioned at the top of the dashboard
- Real-time updates with refresh functionality

## Cost Considerations
- Uses GPT-3.5-turbo (cost-effective model)
- Limited to 200 tokens per request
- Cached responses to minimize API calls
- Optional feature - works without API key

## Security
- Requires valid authentication token
- User-specific greetings only
- No sensitive data sent to OpenAI
- Fallback system ensures privacy
