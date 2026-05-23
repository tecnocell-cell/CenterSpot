import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import { applyThemeFromCfg, loadStoredTheme } from './theme/themeConfig'
import { ThemeProvider } from './contexts/ThemeContext'
import { BrandingProvider } from './contexts/BrandingContext'
import { applyFaviconToDocument, DEFAULT_FAVICON_URL } from './theme/brandingApi'

applyThemeFromCfg(loadStoredTheme())
applyFaviconToDocument(DEFAULT_FAVICON_URL)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
