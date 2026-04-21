interface Props {
  message: string
  onRetry: () => void
}

export default function ErrorCard({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="bg-red-950 border border-red-700 rounded-xl p-6 max-w-md w-full text-center">
        <p className="text-red-400 font-semibold mb-2">Failed to load data</p>
        <p className="text-gray-400 text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
