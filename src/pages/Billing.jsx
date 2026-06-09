import { ArrowLeft } from 'lucide-react'

export function Billing({ onBack }) {
  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold mb-8">Billing</h1>
      <p className="text-sm text-gray-500">Billing is not configured.</p>
    </div>
  )
}
