import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/store.tsx'
import { PomodoroProvider } from './lib/pomodoro.tsx'
import { ToastProvider } from './components/Toast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <PomodoroProvider>
        <ToastProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ToastProvider>
      </PomodoroProvider>
    </StoreProvider>
  </StrictMode>,
)
