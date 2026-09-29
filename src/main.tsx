import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import './index.css'

if (Capacitor.getPlatform() === 'android') document.documentElement.classList.add('native-android')

const VisualEditorPage = React.lazy(() => import('./pages/VisualEditorPage'))
const PlasmicHost = React.lazy(() => import('./plasmic-host'))

function Root() {
  const path = window.location.pathname;
  if (path === '/plasmic-host') return <React.Suspense fallback={<div>جارٍ التحميل…</div>}><PlasmicHost /></React.Suspense>;
  if (path === '/visual-editor') return <React.Suspense fallback={<div>جارٍ التحميل…</div>}><VisualEditorPage /></React.Suspense>;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
