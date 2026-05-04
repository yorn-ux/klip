# Klip

Klip is a full-stack fintech solution that enables users to manage traditional and cryptocurrency payments, create fundraising campaigns, handle business transactions, and resolve disputes — all in one unified platform.

## Features

### 🔐 Authentication & Security
- User Registration & Login — Secure account creation with email verification.
- Password Recovery — Recovery phrase-based account restoration.
- Session Management — Active session monitoring with security controls.
- Two-Factor Authentication — Enhanced account protection.
- Role-Based Access — Admin, Business, and Client user roles.

### 💰 Wallet Management
- Multi-Currency Support — Manage multiple currency wallets.
- Crypto Wallet Integration — Support for USDT on:
  - Binance Smart Chain (BEP20)
  - Ethereum (ERC20)
- Fiat Payments — M-Pesa integration for Safaricom (Kenya and East Africa).
- Card Payments — Visa/Mastercard integration (Coming Soon).
- Fund Conversions — Convert between crypto and fiat seamlessly.

### 🏦 Vaults & Campaigns
- Fundraising Campaigns — Create and manage campaign vaults.
- Campaign Applications — Accept applications for campaign funding.
- Campaign Analytics — Track funding progress and contributor metrics.
- Secure Fund Release — Controlled release of campaign funds.

### 🏢 Business Services
- API Key Management — Generate and manage business API keys for Klip integrations.
- Team Management — Add and manage team members with specific roles.
- Business Analytics — Comprehensive business insights and reporting.
- Webhook Integration — Real-time event notifications for external apps.

### 🛡️ Dispute Resolution
- Support Tickets — Create and track support requests.
- Dispute Management — Formal dispute filing and resolution workflow.
- Ticket History — Complete audit trail of all support interactions.

### 📱 Notifications
- Real-Time Alerts — Instant notification delivery via Klip's engine.
- Notification Preferences — Customizable notification settings.
- Multi-Channel — Email and in-app notifications.

### ⚙️ Admin Dashboard
- User Management — Full user administration capabilities.
- Audit Logs — Comprehensive activity tracking.
- Health Monitoring — System health and performance metrics.
- Security Controls — Platform-wide security configuration.

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── core/         # Security and core utilities
│   ├── models/       # SQLAlchemy ORM models
│   ├── routes/       # API endpoints
│   ├── schemas/      # Pydantic request/response models
│   ├── services/     # Business logic services
│   │   ├── card.py   # Card payments (Visa/Mastercard - Coming Soon)
│   │   ├── crypto.py # Cryptocurrency operations
│   │   ├── email.py  # Email notifications (Resend)
│   │   └── mpesa.py  # M-Pesa mobile money (Safaricom)
│   └── utils/        # Utility functions
├── main.py           # Application entry point
├── config.py         # Configuration management
└── database.py       # Database setup
```

### Frontend (Next.js)
```
frontend/
├── src/
│   ├── app/           # Next.js App Router pages
│   │   ├── admin/     # Admin dashboard pages
│   │   ├── auth/      # Authentication pages
│   │   ├── business/  # Business management
│   │   ├── client/    # Client dashboard
│   │   ├── settings/  # User settings
│   │   ├── support/   # Support center
│   │   ├── vaults/    # Campaign vaults
│   │   └── wallet/    # Wallet management
│   ├── components/    # React components
│   ├── lib/           # Library utilities
│   └── store/         # State management
├── public/            # Static assets
└── package.json       # Dependencies
```

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI
- **Database:** SQLAlchemy (PostgreSQL/SQLite)
- **Authentication:** JWT, OAuth, Bcrypt
- **Crypto:** Web3.py, eth-account
- **Payments:** M-Pesa (Safaricom), Card (Visa/Mastercard - Coming Soon)
- **Email:** Resend
- **Cache:** Redis

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State:** Zustand
- **HTTP:** Axios

## 🚦 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, SQLite for development)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   (Edit `.env` with your specific Klip keys)
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. The Klip interface will be available at <http://localhost:3000>

## 📄 License
This project is licensed under the MIT License.

## 👥 Contributing
Contributions to Klip are welcome! Please read our contributing guidelines before submitting pull requests.