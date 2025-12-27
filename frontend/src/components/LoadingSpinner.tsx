'use client';

export default function LoadingSpinner({
  message = 'AI가 생각하는 중...',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-start space-y-2 p-3">
      <div className="flex space-x-2">
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        ></div>
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        ></div>
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        ></div>
      </div>
      <p className="text-xs text-gray-500">{message}</p>
    </div>
  );
}
