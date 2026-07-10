'use client'

export default function ParametresError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <p className="text-red-600 font-medium mb-2">Erreur dans les paramètres</p>
      <p className="text-sm text-gray-500 mb-6 max-w-md">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[#02133E] text-white rounded-lg text-sm font-medium"
      >
        Réessayer
      </button>
    </div>
  )
}
