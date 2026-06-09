import confetti from 'canvas-confetti'

// Brand-colored confetti burst, fired when the day's tasks are all done.
// Two angled cannons from the lower corners for a celebratory sweep.
const BRAND = ['#c01a10', '#e62216', '#ff4b3a', '#ff7043', '#ffd1cc']

export function fireCelebration() {
  const base = { particleCount: 70, spread: 65, startVelocity: 55, colors: BRAND, scalar: 0.9, ticks: 200 }
  confetti({ ...base, origin: { x: 0.15, y: 0.9 }, angle: 60 })
  confetti({ ...base, origin: { x: 0.85, y: 0.9 }, angle: 120 })
}
