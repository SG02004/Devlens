import React, { useState, useEffect } from "react";
import { Users, Loader2, AlertCircle, Shield, ShieldOff, UserCheck } from "lucide-react";

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${
        isAdmin
          ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
          : "bg-[var(--border-dim)]/30 text-[var(--ink-muted)] border border-[var(--border-dim)]"
      }`}
    >
      {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
      {role}
    </span>
  );
}

export function AdminUsersView({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const token = localStorage.getItem("devlens.auth_token");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/users", { headers: authHeaders });
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  const handleRoleToggle = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setUpdatingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Role update failed");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      notify(`✓ ${user.username} is now ${newRole}`);
    } catch (err) {
      notify(`✗ ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[var(--ink-muted)] text-xs py-16">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading users…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs text-red-400 font-mono">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className="border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-3 text-xs text-[var(--accent)] font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse shrink-0" />
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
            User Management
          </h2>
        </div>
        <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">
          {users.length} registered
        </span>
      </div>

      {users.length === 0 ? (
        <div className="border border-dashed border-[var(--border-dim)] py-16 text-center text-[var(--ink-muted)] text-xs uppercase tracking-widest">
          No users registered yet.
        </div>
      ) : (
        <div className="border border-[var(--border-dim)] overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-dim)]">
            {["Username", "Email", "Name", "Role", "Action"].map((h) => (
              <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-muted)]">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--border-dim)]">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isUpdating = updatingId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr_1.5fr_1fr_auto_auto] gap-2 sm:gap-4 items-start sm:items-center px-4 py-3 hover:bg-[var(--bg-surface)]/50 transition-colors"
                >
                  {/* Username */}
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs font-bold text-[var(--ink)] truncate">
                      {user.username}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--ink-muted)] sm:hidden">
                      {user.email}
                    </span>
                  </div>

                  {/* Email */}
                  <span className="hidden sm:block font-mono text-[10px] text-[var(--ink-muted)] truncate">
                    {user.email}
                  </span>

                  {/* Name */}
                  <span className="font-mono text-[10px] text-[var(--ink-muted)] truncate">
                    {user.name || "—"}
                  </span>

                  {/* Role badge */}
                  <RoleBadge role={user.role} />

                  {/* Action */}
                  {isSelf ? (
                    <span className="font-mono text-[9px] text-[var(--ink-muted)] uppercase tracking-wider italic">
                      (you)
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleRoleToggle(user)}
                      className={`flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                        user.role === "admin"
                          ? "border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-500/5"
                          : "border-[var(--accent)]/40 text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : user.role === "admin" ? (
                        <ShieldOff className="w-3 h-3" />
                      ) : (
                        <Shield className="w-3 h-3" />
                      )}
                      {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
