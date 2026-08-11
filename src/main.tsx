import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AssociateTerminal } from './pages/AssociateTerminal.tsx';
import { GiftMessageViewer } from './pages/GiftMessageViewer.tsx';
import { isAssociateTerminalPath, parseGiftMessageShortId } from './utils/routing.ts';
import './index.css';

const { pathname, search } = window.location;
const giftShortId = parseGiftMessageShortId(pathname);
const isAssociateTerminal = isAssociateTerminalPath(pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {giftShortId ? (
      <GiftMessageViewer shortId={giftShortId} />
    ) : isAssociateTerminal ? (
      <AssociateTerminal key={search} />
    ) : (
      <App />
    )}
  </StrictMode>
);
