const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const talib = require('talib');

// Token del tuo bot Telegram
const token = '7033323010:AAGAP0ASATev7Z6ECLe_6P47m6-FZ-CkSnY';

// Token dell'API di Alpha Vantage per ottenere i dati sul WTI
const alphaVantageApiKey = 'CTOT0BF0D96CK8LU';

// URL del servizio Alpha Vantage per ottenere i dati sul WTI
const alphaVantageUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=CL&apikey=${alphaVantageApiKey}`;

// Crea un'istanza del bot Telegram
const bot = new TelegramBot(token, { polling: true });

// Avvia il bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Benvenuto! Sono il tuo bot Telegram per segnali di trading sul WTI. Per ricevere i segnali, invia /signals.");
});

// Gestisce il comando /signals
bot.onText(/\/signals/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const wtiData = await getWTIData();
    const signal = generateSignal(wtiData);
    bot.sendMessage(chatId, signal);
  } catch (error) {
    console.error('Errore:', error);
    bot.sendMessage(chatId, 'Si è verificato un errore. Riprova più tardi.');
  }
});

// Funzione per ottenere i dati storici sul WTI dall'API di Alpha Vantage
async function getWTIData() {
  const response = await fetch(alphaVantageUrl);
  const data = await response.json();
  const timeSeries = data['Time Series (Daily)'];
  return Object.keys(timeSeries).map(date => {
    return {
      date: date,
      close: parseFloat(timeSeries[date]['4. close'])
    };
  });
}

// Funzione per generare un segnale di acquisto o vendita
function generateSignal(wtiData) {
  // Estrai i prezzi di chiusura
  const closes = wtiData.map(d => d.close);
  
  // Calcola l'RSI (Relative Strength Index)
  const rsiPeriod = 14;
  const rsi = talib.execute({
    name: "RSI",
    startIdx: 0,
    endIdx: closes.length - 1,
    inReal: closes,
    optInTimePeriod: rsiPeriod
  }).result.outReal;

  // Calcola la EMA (Exponential Moving Average)
  const emaPeriod = 20;
  const ema = talib.execute({
    name: "EMA",
    startIdx: 0,
    endIdx: closes.length - 1,
    inReal: closes,
    optInTimePeriod: emaPeriod
  }).result.outReal;

  // Calcola le bande di Bollinger
  const bbPeriod = 20;
  const bb = talib.execute({
    name: "BBANDS",
    startIdx: 0,
    endIdx: closes.length - 1,
    inReal: closes,
    optInTimePeriod: bbPeriod,
    optInNbDevUp: 2,
    optInNbDevDn: 2,
    optInMAType: 0
  }).result;

  const lastRSI = rsi[rsi.length - 1];
  const lastEMA = ema[ema.length - 1];
  const lastBBUpper = bb.outRealUpper[bb.outRealUpper.length - 1];
  const lastBBLower = bb.outRealLower[bb.outRealLower.length - 1];
  
  // Definisci i time frame
  const shortTermFrame = 14; // Time frame a breve termine
  const mediumTermFrame = 30; // Time frame a medio termine
  const longTermFrame = 60; // Time frame a lungo termine

  // Esempio di logica di generazione di segnali basata sui time frame:
  // Se il prezzo è sopra la EMA a breve termine e l'RSI è inferiore a 30, invia un segnale di acquisto a breve termine
  // Se il prezzo è sopra la EMA a medio termine e l'RSI è inferiore a 30, invia un segnale di acquisto a medio termine
  // Se il prezzo è sopra la EMA a lungo termine e l'RSI è inferiore a 30, invia un segnale di acquisto
  
  let message = "Nessun segnale al momento.";
  
  // Verifica il time frame a breve termine
  if (closes[closes.length - shortTermFrame] < lastEMA && lastRSI < 30) {
    message = "Segnale di acquisto a breve termine: il prezzo è sopra la EMA a breve termine e l'RSI è inferiore a 30.";
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(closes, shortTermFrame);
    message += `\nTake Profit: ${takeProfit}, Stop Loss: ${stopLoss}`;
  } else if (closes[closes.length - mediumTermFrame] < lastEMA && lastRSI < 30) {
    message = "Segnale di acquisto a medio termine: il prezzo è sopra la EMA a medio termine e l'RSI è inferiore a 30.";
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(closes, mediumTermFrame);
    message += `\nTake Profit: ${takeProfit}, Stop Loss: ${stopLoss}`;
  } else if (closes[closes.length - longTermFrame] < lastEMA && lastRSI < 30) {
    message = "Segnale di acquisto a lungo termine: il prezzo è sopra la EMA a lungo termine e l'RSI è inferiore a 30.";
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(closes, longTermFrame);
    message += `\nTake Profit: ${takeProfit}, Stop Loss: ${stopLoss}`;
  }

  return message;
}

// Funzione per calcolare il take profit e lo stop loss
function calculateTakeProfitAndStopLoss(closes, timeFrame) {
  // Assumi che il prezzo di ingresso sia l'ultimo prezzo di chiusura nel time frame specificato
  const entryPrice = closes[closes.length - timeFrame];

  // Definisci il rapporto rischio/rendimento desiderato (ad esempio, 1:2)
 

