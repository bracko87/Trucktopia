/**
 * main.tsx
 *
 * Entry point for the client application.
 *
 * Responsibilities:
 * - Import global styles and client-side side-effect modules
 * - Mount the React application into the DOM
 *
 * Note:
 * - We import the clientComponentWear module as a side-effect so it runs
 *   in the browser and attaches window.__componentWear early in the app lifecycle.
 */

import './shadcn.css';
import './components/clientComponentWear';

import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('app')!);

/**
 * Render the root application component into the DOM.
 */
root.render(<App />);