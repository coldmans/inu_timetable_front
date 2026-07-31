import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SpeedInsights } from "@vercel/speed-insights/react"
import { setCurrentSemester } from './utils/timetableUtils'
import { settingsAPI } from './services/api'
import { initializeGoogleAnalytics } from './services/googleAnalytics'

initializeGoogleAnalytics()

// 앱 렌더 전에 서버의 현재 학기 설정을 읽는다. 학기 전환은 관리자 설정으로 이뤄지므로
// 번들 재배포 없이 반영된다. 백엔드 미지원/장애/지연 시에는 기본 학기로 그대로 렌더한다.
const loadCurrentSemester = async () => {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    const data = await Promise.race([settingsAPI.getCurrentSemester(), timeout])
    if (data?.semester) {
      setCurrentSemester(data.semester)
    }
  } catch {
    // 폴백: 번들에 정의된 기본 학기를 유지한다.
  }
}

loadCurrentSemester().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
      <SpeedInsights />
    </React.StrictMode>,
  )
})
