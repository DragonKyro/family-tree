import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// family-chart's stylesheet must load BEFORE our overrides, otherwise its rules
// (e.g. .card-image-rect img height/padding) win the same-specificity tie and
// our customizations get ignored.
import 'family-chart/styles/family-chart.css'
import './styles/app.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
