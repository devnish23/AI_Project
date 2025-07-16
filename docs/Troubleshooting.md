# Troubleshooting

## Common Issues

### 1. Cannot connect to MongoDB
- Ensure MongoDB is running and accessible at the URI specified in `.env`.
- Check firewall and network settings.

### 2. JWT Authentication Fails
- Verify JWT_SECRET matches between backend and frontend.
- Check token expiration and format.

### 3. File Upload Errors
- Ensure file type and size meet requirements.
- Check server logs for Multer errors.

### 4. CORS Errors
- Confirm CLIENT_URL in `.env` matches frontend URL.
- Adjust CORS settings in backend.

### 5. Build/Dependency Issues
- Delete `node_modules` and reinstall dependencies.
- Ensure Node.js and npm versions are compatible.

### 6. Scripts Fail to Fetch/Scrape Data
- Check network connectivity to Red Hat sources.
- Review script logs for error details. 