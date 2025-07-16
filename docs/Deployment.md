# Deployment Guide

## Backend Deployment
1. Set environment variables in `.env` (see `env.example`)
2. Install dependencies: `npm install`
3. Start server: `npm run server` or `node server/index.js`
4. For production, use a process manager (e.g., PM2) and configure reverse proxy (e.g., Nginx)

## Frontend Deployment
1. Install dependencies: `cd client && npm install`
2. Build the React app: `npm run build`
3. Deploy the `client/build` folder to your hosting service (e.g., Netlify, Vercel, S3)

## Environment Variables
- NODE_ENV
- PORT
- MONGODB_URI
- JWT_SECRET
- CLIENT_URL

## Production Tips
- Use HTTPS
- Set secure, unique JWT_SECRET
- Enable CORS only for trusted domains
- Monitor logs and errors 