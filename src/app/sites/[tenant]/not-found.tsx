import Link from 'next/link';

export default function TenantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-indigo-600">
        404
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Storefront not found
      </h1>
      <p className="mt-4 max-w-md text-base text-gray-600">
        The storefront you are looking for does not exist, has been renamed, or is
        no longer active on Vessel Engine.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
      >
        Return to Vessel Engine
      </Link>
    </main>
  );
}