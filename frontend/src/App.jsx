import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [msg, setMsg] = useState('hi')

  return (
    <div style={{ padding: 20 }}>
      <h1>Chore, I'll do it *^_^*</h1>
      <div>{msg}</div>
    </div>
  )
}

export default App