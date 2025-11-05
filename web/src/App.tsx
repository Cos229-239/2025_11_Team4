import { useEffect, useState } from "react";

type Order = { id: string; items: string[]; status: string; ts: string };

// Fallback to localhost:3000 if .env wasn't picked up
const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<Order | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    console.log("Fetching orders from:", `${API}/orders`);
    fetch(`${API}/orders`)
      .then((r) => r.json())
      .then(setOrders)
      .catch((e) => {
        console.error(e);
        setErr(String(e));
        setOrders([]);
      });
  }, []);

  return (
    <div className="min-h-screen p-6">
      {/* Debug banner (remove later) */}
      <div className="text-xs text-gray-500 mb-2">
        API: {API} {err && <span className="text-red-600">• {err}</span>}
      </div>

      <h1 className="text-2xl font-bold mb-4">Kitchen Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">Orders</h2>
          {orders.length === 0 ? (
            <div className="text-gray-500 text-sm">No orders yet.</div>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="border rounded p-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setActive(o)}
                >
                  <div className="flex justify-between">
                    <span>#{o.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                      {o.status}
                    </span>
                  </div>
                  <div className="text-sm">{o.items.join(", ")}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2 border rounded p-3">
          <h2 className="font-semibold mb-2">Ticket</h2>
          {active ? (
            <div>
              <div className="text-lg font-bold mb-1">Order #{active.id}</div>
              <div className="mb-2">Items: {active.items.join(", ")}</div>
              <div>Status: {active.status}</div>
              <div>Time: {active.ts}</div>
            </div>
          ) : (
            <div className="text-gray-500">Select an order</div>
          )}
        </div>
      </div>
    </div>
  );
}
