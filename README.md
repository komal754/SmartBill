# SmartBill – Modern Expense & Payment Tracker

SmartBill is a full-featured, modern web app for tracking expenses and payments, powered by advanced analytics and AI. Designed for individuals and small businesses, it offers a beautiful, responsive UI, insightful reports, and a smart chatbot for personal finance advice.

## Features

- **Modern UI**: Clean, responsive design with professional navigation and profile pages.
- **Expense & Payment Tracking**: Add, edit, and categorize expenses and payments with ease.
- **Analytics & Reports**: Visualize spending trends, savings, and receive actionable financial tips.
- **Export Data**: Download your data as CSV or PDF for offline use.
- **AI Chatbot**: Get instant answers to finance questions, powered by real database data and public AI fallback.
- **User Management**: Secure registration, login, and profile management (with password confirmation).
- **Accessibility**: Keyboard navigation, ARIA labels, and high-contrast support.
- **Anomaly Detection**: Get notified of unusual transactions.
- **PWA Support**: Installable on mobile devices for a native app experience.
- **Mobile-First**: Hamburger menu and responsive layouts for all devices.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Heroicons, Chart.js
- **Backend**: FastAPI (Python), Go, Neon (PostgreSQL)
- **AI**: HuggingFace Inference API, custom intent detection
- **Other**: PWA, Service Worker, CSV/PDF export

## Getting Started

1. **Clone the repo:**
   ```
   git clone https://github.com/komal754/smartbill.git
   cd smartbill
   ```
2. **Install dependencies:**
   - Frontend:
     ```
     cd frontend
     npm install
     ```
   - Backend:
     ```
     cd ../backend
     python -m venv venv
     venv\Scripts\activate  # On Windows
     # or
     source venv/bin/activate  # On Mac/Linux
     pip install -r ../requirements.txt
     ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in your secrets (DB URLs, API keys, etc.)
4. **Run the app:**
   - Frontend:
     ```
     npm run dev
     ```
   - Backend:
     ```
     uvicorn main:app --reload
     ```

## License

MIT
