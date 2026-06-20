import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white border-t px-4 py-4 text-center mt-auto">
      <p className="text-sm text-gray-500">
        © {new Date().getFullYear()} LINE LIFF App. All rights reserved.
      </p>
    </footer>
  );
}
