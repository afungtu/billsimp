# Billsimp — Intelligent Invoice and Business Management System

> **Course:** CEC418 — Software Construction  
> **Student:** Afungtu Carine Tanui | **Matricule:** CT23A007  
> **Stack:** React 18 · Firebase 10 · Recharts · jsPDF

---

## What is Billsimp?

Billsimp is a full-stack intelligent business management system that allows small businesses and freelancers to manage clients, create invoices, generate quotations, download PDFs, and analyse their business performance using AI-powered predictions and data mining.

---

## Features

### Core Business Features
| Feature | Description |
|---|---|
| Authentication | Firebase email/password login and registration |
| Dashboard | KPI cards showing revenue, clients, invoices, quotations |
| Clients | Full CRUD — add, edit, delete, search clients |
| Invoices | Full CRUD with status tracking, tax calculation, PDF download |
| Quotations | Full CRUD with one-click conversion to invoice, PDF download |

### AI & Analytics Features
| Feature | AI Function Used |
|---|---|
| Revenue Prediction | Linear Regression on monthly invoice history |
| 3-Month Forecast | Extended regression model with chart visualisation |
| Growth Rate Analysis | Month-over-month percentage change detection |
| Top Clients | Data mining — clients ranked by total revenue |
| Payment Behaviour | Client reliability grading (excellent / good / fair / poor) |
| Service Breakdown | Data mining — top services/items by income generated |
| AI Insights | Plain-English business insights generated from model output |

---

## Technology Stack

```
Frontend   React 18 + React Router v6
Backend    Firebase 10 (Firestore + Authentication)
AI / Math  Custom Linear Regression (no external ML library)
Charts     Recharts (AreaChart, BarChart, ComposedChart)
PDF        jsPDF + jsPDF-autotable
Styling    Pure CSS with CSS Variables (dark theme)
```

---

## Project Structure

```
src/
├── App.js                    # Routing (all 7 pages)
├── index.js                  # React entry point
├── components/
│   ├── AppLayout.js          # Sidebar + topbar wrapper
│   ├── Sidebar.js            # Navigation menu
│   ├── PrivateRoute.js       # Auth guard
│   └── InvoiceItemsEditor.js # Line items table editor
├── context/
│   └── AuthContext.js        # Firebase Auth context
├── firebase/
│   ├── firebaseConfig.js     # Firebase initialisation
│   └── firestore.js          # All Firestore CRUD operations
├── pages/
│   ├── Login.js              # Login page
│   ├── Register.js           # Registration page
│   ├── Dashboard.js          # Home dashboard
│   ├── Clients.js            # Client management
│   ├── Invoices.js           # Invoice management + PDF
│   ├── Quotations.js         # Quotation management + PDF
│   └── Analytics.js          # AI predictions + data mining
├── styles/
│   ├── global.css            # Full dark theme design system
│   └── analytics.css         # Analytics page styles
└── utils/
    ├── aiPredictions.js      # All AI and data mining functions
    ├── generatePDF.js        # Invoice and quotation PDF generator
    └── helpers.js            # Shared utility functions
```

---

## AI Functions — How They Work

### Linear Regression (Revenue Prediction)
Uses the formula **y = mx + b** where:
- `x` = month index (1, 2, 3…)
- `y` = monthly revenue
- `m` = slope (average monthly growth)
- `b` = intercept

Predicts next month's revenue based on historical invoice data.

### Data Mining Functions
- **`groupRevenueByMonth`** — aggregates invoices into monthly totals
- **`getTopClients`** — ranks clients by total billed amount
- **`analyzePaymentBehavior`** — grades clients on payment reliability
- **`getMonthlyGrowthRates`** — computes month-over-month % change
- **`forecastRevenue`** — extends regression model 3 months forward
- **`getServiceBreakdown`** — ranks invoice line items by revenue generated

---

## DevOps Pipeline

```
Developer pushes code
        │
        ▼
    GitHub (version control)
        │
        ▼
    Jenkins (CI/CD pipeline)
    ├── npm ci
    ├── ESLint check
    ├── npm run build
    ├── docker build
    └── firebase deploy
        │
        ▼
    Firebase Hosting (live site)
    Firebase Auth + Firestore (backend)
```

---

## Running Locally

```bash
git clone https://github.com/afungtu/billsimp.git
cd billsimp
npm install
npm start
```

App runs at **http://localhost:3000**

---

## Academic Context

This project was built as part of the **CEC418 Software Construction** course, following the 5-stage BA process:

1. **Requirement Analysis** — identified features needed by small businesses
2. **System Design** — designed Firebase schema, component hierarchy, AI model
3. **Implementation** — built all pages, AI functions, PDF generation
4. **Testing** — tested AI predictions with 6 months of realistic invoice data
5. **Deployment** — deployed to Firebase Hosting with GitHub version control
