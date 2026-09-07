import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// refetchOnWindowFocus: an. Saemtliche Inhalte kommen aus /data und aendern sich
// laufend (Tabellen, Kalender). Wer die App wieder in den Vordergrund holt, soll den
// aktuellen Stand sehen, ohne etwas zu tun — der Service Worker holt die Dateien dank
// NetworkFirst frisch vom Server und faellt nur ohne Netz auf den Cache zurueck.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
