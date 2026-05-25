import Link from "next/link";

export default function Navbar() {
  return (
    <div className="flex h-16 w-full items-center justify-between bg-gray-800 px-4 text-white">
      <div className="text-lg font-bold">LineMe Dashboard</div>
      <div className="space-x-4">
        <Link href="/dashboard">
          <button className="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600">
            Home
          </button>
        </Link>
        <Link href="/dashboard/keyword">
          <button className="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600">
            Keywords
          </button>
        </Link>
        <button className="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600">
          Settings
        </button>
        <button className="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600">
          Logout
        </button>
      </div>
    </div>
  );
}
