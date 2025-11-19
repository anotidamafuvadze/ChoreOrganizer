import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [msg, setMsg] = useState('hi')

  return (
    <div style={{ padding: 20 }}>
      <h1>Term Project Frontend</h1>
      <div>{msg}</div>
    </div>
  )
}

export default App