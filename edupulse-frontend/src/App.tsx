import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import { useThemeStore } from './stores/themeStore'

export default function App() {
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return <RouterProvider router={router} />
}
