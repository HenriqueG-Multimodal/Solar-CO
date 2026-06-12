import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App_debug';
import '../index.css';

console.log('[v0] main.tsx iniciado');

const root = document.getElementById('root');
console.log('[v0] Root element:', root);

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
