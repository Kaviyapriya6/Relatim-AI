# Relatim AI Chat - Full Stack Application

A modern WhatsApp-style messaging application with AI integration, built with React and Node.js.

## 🚀 Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd whatsapp-ai-chat
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example files
   cp .env.example .env.local
   cp frontend/.env.example frontend/.env.local
   
   # Edit the files with your actual values
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts both frontend (http://localhost:3000) and backend (http://localhost:5000)

### Production Deployment on Vercel

#### Prerequisites
- Vercel account
- PostgreSQL database (Supabase, Railway, or other)
- Google AI API key

#### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/whatsapp-ai-chat.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Connect your GitHub repository to Vercel
   - Import your project
   - Vercel will automatically detect the configuration

3. **Set Environment Variables in Vercel:**
   
   Go to your Vercel project settings → Environment Variables and add:

   **Required Variables:**
   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   JWT_SECRET=your-super-secret-jwt-key-here
   GOOGLE_AI_API_KEY=your-google-ai-api-key
   FRONTEND_URL=https://your-app-name.vercel.app
   NODE_ENV=production
   ```

   **Optional Variables:**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   MAX_FILE_SIZE=10485760
   BCRYPT_ROUNDS=12
   ```

4. **Deploy:**
   Vercel will automatically build and deploy your application.

## 📁 Project Structure

```
whatsapp-ai-chat/
├── frontend/          # React application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js API
│   ├── src/
│   ├── database/
│   ├── index.js       # Vercel entry point
│   └── package.json
├── vercel.json        # Vercel configuration
├── package.json       # Root package.json
└── README.md
```

## 🔧 Configuration Files

### vercel.json
Configures how Vercel builds and serves your application:
- Frontend: Static build with React
- Backend: Serverless functions with Node.js
- Routes: API calls to `/api/*` go to backend, everything else to frontend

### Root package.json
Manages the monorepo with scripts for:
- `npm run dev` - Start both frontend and backend in development
- `npm run build` - Build both applications for production
- `npm run install:all` - Install dependencies for both applications

## 🌐 API Routes

All API routes are prefixed with `/api/`:

- `/api/auth` - Authentication (login, register, verify)
- `/api/users` - User management
- `/api/contacts` - Contact management
- `/api/messages` - Messaging functionality
- `/api/ai` - AI chat integration
- `/api/health` - Health check endpoint

## 📊 Features

### Frontend Features
- ✅ Real-time messaging interface
- ✅ AI chat integration
- ✅ File upload support
- ✅ Contact management
- ✅ User authentication
- ✅ Responsive design
- ✅ Dark/light mode
- ✅ Message search
- ✅ Typing indicators

### Backend Features
- ✅ RESTful API
- ✅ JWT authentication
- ✅ PostgreSQL database
- ✅ File upload handling
- ✅ Google AI integration
- ✅ Rate limiting
- ✅ Security middleware
- ✅ Error handling

## 🔒 Security

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API routes
- CORS configuration
- Helmet security headers
- Input validation
- SQL injection protection

## 📝 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Google AI
GOOGLE_AI_API_KEY=your-api-key

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password
```

### Frontend (.env)
```bash
# API Configuration (optional - defaults to relative /api)
REACT_APP_API_URL=

# App Configuration
REACT_APP_NAME=WhatsApp AI Chat
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_AI_CHAT=true
REACT_APP_ENABLE_FILE_UPLOAD=true
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify your DATABASE_URL is correct
   - Ensure your database is accessible from Vercel
   - Check if you need to whitelist Vercel IPs

2. **Environment Variables Not Working**
   - Ensure variables are set in Vercel dashboard
   - Redeploy after adding environment variables
   - Check variable names match exactly

3. **API Routes Not Working**
   - Verify `/api/*` routes are configured correctly
   - Check that backend builds successfully
   - Look at Vercel function logs

4. **Build Failures**
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

### Logs and Debugging

- **Vercel Logs**: View in Vercel dashboard → Functions tab
- **Frontend Console**: Browser developer tools
- **Database Logs**: Check your database provider's dashboard

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Verify all environment variables are set correctly
4. Ensure your database is accessible

## 🔄 Updates and Maintenance

To update your deployment:
1. Make changes to your code
2. Commit and push to GitHub
3. Vercel will automatically redeploy

To update dependencies:
```bash
npm run install:all
npm update
```

## 📄 License


This project is licensed under the MIT License.
