# 🏨 SiteNest - Premium Luxury Apartment Booking Platform

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

</div>

**Where Luxury Isn't Just Lived — It's Experienced**

SiteNest is a sophisticated, full-stack web application designed for premium luxury apartment bookings in Islamabad, Pakistan. Built with modern technologies and featuring real-time capabilities, comprehensive authentication, and an intelligent AI chatbot.

## 🎯 Live Demo

> **Note**: This is a portfolio project showcasing modern web development practices and technologies.

- **Frontend**: Modern React application with TypeScript
- **Backend**: RESTful API with real-time capabilities
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI-powered chatbot for customer assistance

## ✨ Key Features

### 🔐 Authentication & User Management
- **Multi-Provider Authentication**: Email/password, Google OAuth
- **Role-Based Access Control**: Customer, Affiliate, Admin, Super Admin roles
- **Profile Management**: Complete user profiles with image upload
- **Secure Sessions**: JWT-based authentication with secure session management

### 🏠 Apartment Management
- **Dynamic Listings**: Real-time apartment availability and pricing
- **Image Management**: Local file upload with support for multiple images per listing
- **Advanced Search**: Filter by amenities, price range, and availability
- **Detailed Views**: Interactive apartment detail pages with image carousels

### 📅 Booking System
- **Real-Time Availability**: Live availability checking with conflict prevention
- **Booking Requests**: Streamlined booking request workflow
- **Payment Integration**: EasyPaisa payment confirmation via WhatsApp
- **Calendar Integration**: Visual calendar for booking management
- **Automatic Cleanup**: Expired booking request removal

### 🤖 AI-Powered Chatbot
- **OpenAI Integration**: Intelligent conversation handling
- **Booking Assistance**: Automated booking flow guidance
- **Smart Filtering**: Filters non-serious inquiries
- **WhatsApp Integration**: Seamless handoff to WhatsApp for payments

### 💰 Affiliate Program
- **Referral System**: Unique affiliate links with tracking
- **Dynamic Pricing**: Custom pricing adjustments for affiliates
- **Commission Tracking**: Real-time metrics and analytics
- **Application Process**: Streamlined affiliate onboarding

### ⭐ Review System
- **Unified Reviews**: Reviews appear on both detail pages and home testimonials
- **Real-Time Updates**: Live review updates via Socket.IO
- **User Management**: Users can manage their own reviews
- **Rating System**: 5-star rating with detailed feedback

### 📊 Admin Dashboard
- **Comprehensive Management**: Users, bookings, apartments, reviews
- **Real-Time Analytics**: Live dashboard updates
- **Bulk Operations**: Efficient data management tools
- **Export Capabilities**: CSV export for data analysis

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Framer Motion** for animations
- **Socket.IO Client** for real-time features
- **React Query** for state management
- **React Hook Form** for form handling

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Socket.IO** for real-time communication
- **Drizzle ORM** with PostgreSQL
- **Passport.js** for authentication
- **Winston** for logging
- **Multer** for file uploads
- **Helmet** for security

### Database & Storage
- **PostgreSQL** (Neon Database recommended)
- **Local File Storage** for images
- **Redis** for caching (optional)

### External Services
- **OpenAI API** for AI chatbot
- **Google OAuth** for authentication
- **Nodemailer** for email services

## 🚀 Installation & Setup

### Prerequisites
- **Node.js 18+**
- **PostgreSQL database** (Neon Database recommended)
- **OpenAI API key** (required for chatbot)
- **Google OAuth credentials** (optional, for Google login)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sitenest.git
   cd sitenest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database (Required)
   DATABASE_URL=your_postgresql_connection_string

   # OpenAI (Required)
   OPENAI_API_KEY=your_openai_api_key

   # Authentication (Required)
   SESSION_SECRET=your_session_secret_key
   JWT_SECRET=your_jwt_secret_key

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Email Configuration (Optional)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password

   # Application Settings
   NODE_ENV=development
   PORT=5000
   ```

4. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   🎉 **Application will be available at:** `http://localhost:5000`

## 🚀 Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

3. **Memory-optimized start** (recommended for production)
   ```bash
   npm run start:memory
   ```

## 📁 Project Structure

```
sitenest/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility libraries
│   │   └── utils/             # Helper functions
│   ├── public/                # Static assets
│   └── index.html             # HTML template
├── server/                    # Backend Express application
│   ├── config/                # Configuration management
│   ├── constants/             # Application constants
│   ├── middleware/            # Express middleware
│   ├── services/              # Business logic services
│   ├── utils/                 # Server utilities
│   ├── routes.ts              # Main API routes
│   ├── db.ts                  # Database connection
│   └── index.ts               # Server entry point
├── shared/                    # Shared types and schemas
│   └── schema.ts              # Database schema and types
├── uploads/                   # File upload storage
├── migrations/                # Database migrations
├── scripts/                   # Utility scripts
├── dist/                      # Production build output
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite build configuration
└── README.md                  # Project documentation
```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for chatbot functionality |
| `SESSION_SECRET` | ✅ | Secret key for session encryption |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID (for Google login) |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret |
| `EMAIL_USER` | ❌ | Gmail account for email notifications |
| `EMAIL_PASSWORD` | ❌ | Gmail app password |
| `NODE_ENV` | ❌ | Environment (development/production) |
| `PORT` | ❌ | Server port (default: 5000) |

### Business Configuration

The application includes configurable business settings:

- **Location**: Islamabad, Pakistan (Cube Apartments Tower 2)
- **Currency**: Pakistani Rupees (PKR)
- **Contact**: +92-311-5197087 (WhatsApp/EasyPaisa)
- **Booking**: 500-2000 PKR advance payment range
- **Commission**: 10% affiliate commission rate

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Apartment Management
- `GET /api/apartments` - List all apartments
- `GET /api/apartments/:id` - Get apartment details
- `POST /api/apartments` - Create apartment (Admin only)
- `PUT /api/apartments/:id` - Update apartment (Admin only)
- `DELETE /api/apartments/:id` - Delete apartment (Admin only)

### Booking System
- `GET /api/bookings` - List user bookings
- `POST /api/bookings` - Create booking request
- `PUT /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking
- `POST /api/availability-check` - Check room availability

### Review System
- `GET /api/reviews` - List all reviews
- `POST /api/reviews` - Add new review
- `DELETE /api/reviews/:id` - Delete review (own reviews only)

### Affiliate System
- `GET /api/affiliate/links` - List affiliate links
- `POST /api/affiliate/apply` - Apply for affiliate program
- `GET /api/affiliate/metrics` - Get affiliate performance metrics
- `GET /api/track/affiliate/:code` - Track affiliate link clicks

### AI Chatbot
- `POST /api/chat/ai` - Send message to AI chatbot
- `GET /api/chat/history` - Get chat history

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:gc           # Start with garbage collection optimization

# Production
npm run build            # Build for production
npm start                # Start production server
npm run start:memory     # Start with memory optimization

# Database
npm run db:generate      # Generate database migrations
npm run db:push          # Push schema changes to database
npm run db:seed          # Seed database with initial data

# Code Quality
npm run check            # TypeScript type checking
npm run lint             # Run linting
```

### Development Guidelines

- Follow TypeScript best practices
- Use proper error handling and logging
- Implement responsive design patterns
- Follow the existing code style and structure
- Use semantic commit messages

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure all required environment variables
   - Ensure PostgreSQL database is accessible

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Start Production Server**
   ```bash
   npm run start:memory  # Recommended for production
   ```

### Platform-Specific Deployment

#### Replit
1. Import repository to Replit
2. Configure environment variables in Replit Secrets
3. Application will automatically deploy on port 5000

#### Traditional Hosting (VPS/Cloud)
1. Set up PostgreSQL database
2. Configure environment variables
3. Set up reverse proxy (nginx recommended)
4. Use process manager (PM2 recommended)

## 🔒 Security Features

- **Helmet.js**: Security headers and Content Security Policy
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Protection**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Input sanitization and output encoding
- **Secure Sessions**: HTTP-only cookies with secure flags
- **Authentication**: JWT-based authentication with role-based access

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern Interface**: Clean, intuitive design with Radix UI components
- **Accessibility**: WCAG 2.1 compliant with proper ARIA labels
- **Performance**: Optimized loading with Vite and code splitting
- **Animations**: Smooth transitions with Framer Motion

## 🔄 Real-Time Features

- **Live Updates**: Socket.IO integration for real-time communication
- **Booking Notifications**: Instant booking alerts and status updates
- **Review Updates**: Live review additions and updates
- **Dashboard Metrics**: Real-time analytics and performance monitoring
- **Chat System**: Live AI chatbot with instant responses

## 🤝 Contributing

We welcome contributions to SiteNest! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Maintain code consistency and style
- Update documentation for new features
- Use semantic commit messages
- Ensure responsive design compatibility

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👥 Author

**Mahmad Afzal** - *Full-Stack Developer & Project Architect*
- 📧 Email: mahmadafzal880@gmail.com
- 💼 LinkedIn: [Connect with me](https://linkedin.com/in/mahmadafzal)
- 🐙 GitHub: [@mahmadafzal](https://github.com/mahmadafzal)

## 🙏 Acknowledgments

Special thanks to the open-source community and these amazing projects:

- **OpenAI** - AI chatbot integration
- **Radix UI** - Accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **Drizzle ORM** - Type-safe database toolkit
- **React & TypeScript** - Modern web development stack

## 📞 Support & Contact

For support, questions, or business inquiries:

- **📧 Email**: mahmadafzal880@gmail.com
- **📱 WhatsApp**: +92-311-5197087
- **📍 Location**: Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad, Pakistan
- **🌐 Application**: http://localhost:5000 (development)

---

<div align="center">

**🏨 SiteNest** - *Transforming luxury apartment booking experiences*

[![Made with ❤️ in Pakistan](https://img.shields.io/badge/Made%20with%20❤️%20in-Pakistan-green?style=for-the-badge)](https://github.com/mahmadafzal)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

*A modern full-stack web application showcasing advanced development practices and technologies*

</div>
