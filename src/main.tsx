import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { GiftMessageViewer } from './pages/GiftMessageViewer.tsx';
import { parseGiftMessageShortId } from './utils/routing.ts';
import './index.css';

const shortId = parseGiftMessageShortId(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shortId ? <GiftMessageViewer shortId={shortId} /> : <App />}
  </StrictMode>
);
