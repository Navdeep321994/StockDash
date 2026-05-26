# Stock Market Dashboard - Setup Instructions

## Project Structure

```
stock-market-app/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles with Tailwind CSS
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── postcss.config.js    # PostCSS configuration
└── test-api.html        # API testing page
```

## Setup Steps

### 1. Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

If you encounter SSL certificate issues, you can try:

```bash
npm install --strict-ssl=false
```

Or disable npm strict SSL:

```bash
npm config set strict-ssl false
```

### 2. Run the Application

After installing dependencies, start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 3. Test APIs

To test the APIs directly, open `test-api.html` in your browser. This will allow you to verify that all API endpoints are working correctly.

## Features

### 20+ API Endpoints

The app includes access to all these stock market APIs:

#### Market Data
- **IPOs** - Initial Public Offerings data
- **News** - Latest market news and updates
- **Stock** - Detailed stock information
- **Trending** - Currently trending stocks
- **Financial Statement** - Company financial data
- **Commodities** - Commodity market data
- **Mutual Funds** - Mutual fund information
- **Price Shockers** - Stocks with significant price movements

#### Exchange Data
- **BSE Most Active** - Most active stocks on BSE
- **NSE Most Active** - Most active stocks on NSE

#### Analysis Tools
- **Historical Data** - Historical stock data
- **Industry Search** - Search by industry
- **Stock Forecasts** - Stock price forecasts
- **Historical Stats** - Historical statistics
- **Corporate Actions** - Corporate actions data
- **Mutual Fund Search** - Search mutual funds
- **Target Price** - Target price analysis
- **Mutual Fund Details** - Mutual fund details
- **Announcements** - Recent announcements
- **52 Week High/Low** - 52-week high and low data

## Usage

1. **Select an API**: Click on any endpoint in the sidebar to view that data type
2. **Search**: Use the search bar to filter results (e.g., stock name, company, etc.)
3. **View Data**: Data is displayed in a formatted JSON view for easy inspection

## API Configuration

The API key is configured in `App.tsx`:

```typescript
const API_BASE_URL = 'https://stock.indianapi.in';
const API_KEY = 'sk-live-ihdJabhIypHzFrJyenJqQT31GfAERUPc3syC9xHC';
```

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Troubleshooting

### SSL Certificate Issues
If you encounter SSL certificate errors during npm install:
1. Try using `--strict-ssl=false` flag
2. Or disable strict SSL: `npm config set strict-ssl false`

### API Not Responding
If the API endpoints are not responding:
1. Check your internet connection
2. Verify the API key is correct
3. Check if the API service is available

### Dependencies Not Installing
If dependencies are not installing:
1. Make sure Node.js is installed (v18 or higher)
2. Try clearing npm cache: `npm cache clean --force`
3. Delete `node_modules` and `package-lock.json`, then run `npm install` again

## License

MIT
