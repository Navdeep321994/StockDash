# Stock Market Dashboard

A comprehensive React application for accessing multiple stock market APIs with a modern, responsive UI.

## Features

- **20+ API Endpoints**: Access IPOs, news, stock data, commodities, mutual funds, and more
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **Real-time Data**: Fetch live stock market data
- **Search Functionality**: Search for specific stocks, funds, and queries
- **Mobile Responsive**: Works on desktop and mobile devices

## API Endpoints

The app includes access to all these APIs:
- IPOs
- News
- Stock Data
- Trending Stocks
- Financial Statements
- Commodities
- Mutual Funds
- Price Shockers
- BSE Most Active
- NSE Most Active
- Historical Data
- Industry Search
- Stock Forecasts
- Historical Stats
- Corporate Actions
- Mutual Fund Search
- Target Price
- Mutual Fund Details
- Announcements
- 52 Week High/Low

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd stock-market-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

## Usage

1. **Select an API**: Click on any endpoint in the sidebar to view that data type
2. **Search**: Use the search bar to filter results (e.g., stock name, company, etc.)
3. **View Data**: Data is displayed in a formatted JSON view for easy inspection

## Configuration

The API key is configured in the app. Make sure to keep your API key secure in production.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Project Structure

```
stock-market-app/
├── src/
│   ├── components/
│   ├── lib/
│   │   └── api.ts
│   ├── constants/
│   │   └── endpoints.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── postcss.config.js
```

## License

MIT
