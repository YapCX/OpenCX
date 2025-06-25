import { Moon, Sun } from "lucide-react"
import { Button } from "./button"
import { useTheme } from "../../contexts/ThemeContext"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export function ThemeToggleSwitch() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4" />
      <Button
        variant="outline"
        size="sm"
        onClick={toggleTheme}
        className="h-6 w-11 p-0"
      >
        <div className={`h-4 w-4 rounded-full bg-primary transition-transform ${isDark ? 'translate-x-3' : '-translate-x-3'}`} />
      </Button>
      <Moon className="h-4 w-4" />
    </div>
  )
}