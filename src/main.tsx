import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({ immediate: true })

// No StrictMode: its double-mounting would attach duplicate sensor and GPS
// listeners, which the detection engine treats as real duplicate readings.
createRoot(document.getElementById('root')!).render(<App />)
