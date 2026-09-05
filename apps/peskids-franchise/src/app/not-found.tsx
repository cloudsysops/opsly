export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
    </div>
  );
}
