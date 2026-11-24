import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search, Shield, ShieldOff, Trash2, Users } from "lucide-react";
import { request } from "../../controllers/apiClient";

const buttonClass = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50";
const neutralButton = buttonClass + " border-[var(--border-dim)] text-[var(--ink)] hover:bg-[var(--bg-elevated)]";
const dangerText = "text-red-300 [html[data-theme=light]_&]:text-red-700";
const dangerButton = buttonClass + " border-red-500/40 hover:bg-red-500/10 " + dangerText;

export function AdminUsersView({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pendingId, setPendingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [removalTarget, setRemovalTarget] = useState(null);
  const [removalError, setRemovalError] = useState("");
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const searchRef = useRef(null);

  const loadUsers = useCallback(async (signal) => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await request("/api/admin/users", { signal });
      if (!Array.isArray(data?.users)) {
        throw new Error("The server returned an invalid user list.");
      }
      if (!signal?.aborted) setUsers(data.users);
    } catch (error) {
      if (!signal?.aborted) setLoadError(error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  useEffect(() => {
    if (removalTarget) {
      dialogRef.current.showModal();
      cancelRef.current.focus();
    }
  }, [removalTarget]);

  const query = search.trim().toLowerCase();
  const visibleUsers = users.filter((user) =>
    (roleFilter === "all" || user.role === roleFilter) &&
    [user.name, user.username, user.email].some((value) => value?.toLowerCase().includes(query))
  );

  async function changeRole(user) {
    const role = user.role === "admin" ? "user" : "admin";
    setPendingId(user.id);
    setFeedback(null);
    try {
      await request("/api/admin/users/" + encodeURIComponent(user.id) + "/role", {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      await loadUsers();
      setFeedback({ message: "Role updated for @" + user.username + "." });
    } catch (error) {
      setFeedback({ message: error.message, error: true });
    } finally {
      setPendingId(null);
    }
  }

  function closeRemoval() {
    dialogRef.current.close();
    setRemovalTarget(null);
    setRemovalError("");
  }

  async function confirmRemoval() {
    const user = removalTarget;
    if (!user || pendingId) return;
    setPendingId(user.id);
    setRemovalError("");
    setFeedback(null);
    try {
      await request("/api/admin/users/" + encodeURIComponent(user.id), { method: "DELETE" });
      setUsers((previous) => previous.filter((entry) => entry.id !== user.id));
      closeRemoval();
      searchRef.current?.focus();
      setFeedback({ message: "Removed @" + user.username + "." });
    } catch (error) {
      if (error.status === 404) {
        closeRemoval();
        searchRef.current?.focus();
        setUsers((previous) => previous.filter((entry) => entry.id !== user.id));
        setFeedback({ message: "@" + user.username + " was already removed." });
        await loadUsers();
      } else {
        setRemovalError(error.message);
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="admin-users-heading" className="min-w-0 space-y-5 font-sans">
      <div>
        <h2 id="admin-users-heading" className="flex items-center gap-2 text-xl font-semibold text-[var(--ink)]">
          <Users aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" />
          User management
        </h2>
      </div>

      <div className="rounded-xl border border-[var(--border-dim)] bg-[var(--bg-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-dim)] p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search users</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--ink-muted)]" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, username, or email"
              className="h-10 w-full rounded-md border border-[var(--border-dim)] bg-[var(--bg)] pl-9 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            Role
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 flex-1 rounded-md border border-[var(--border-dim)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              <option value="all">All roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm text-[var(--ink-muted)]">
          <p aria-live="polite">
            {loading ? "Loading users…" : loadError ? "User list unavailable" : "Showing " + visibleUsers.length + " of " + users.length + " users"}
          </p>
          {feedback && (
            <p role={feedback.error ? "alert" : "status"} className={feedback.error ? dangerText : "text-[var(--ink)]"}>
              {feedback.message}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[var(--accent)]" />
          </div>
        ) : loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-dim)] p-4">
            <p role="alert" className={"flex items-center gap-2 text-sm " + dangerText}>
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {loadError}
            </p>
            <button type="button" className={neutralButton} onClick={() => loadUsers()}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : visibleUsers.length === 0 ? (
          <p className="border-t border-[var(--border-dim)] px-4 py-8 text-sm text-[var(--ink-muted)]">
            {users.length ? "No users match your search or role filter." : "No registered users yet."}
          </p>
        ) : (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_6rem_17rem] gap-4 border-y border-[var(--border-dim)] px-4 py-2 text-xs font-semibold text-[var(--ink-muted)] lg:grid">
              <span>Account</span><span>Role</span><span>Actions</span>
            </div>
            <ul className="divide-y divide-[var(--border-dim)]">
              {visibleUsers.map((user) => (
                <li key={user.id} className="grid min-w-0 gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_6rem_17rem] lg:items-center lg:gap-4">
                  <div className="min-w-0 break-words">
                    <div className="text-sm font-semibold text-[var(--ink)]">
                      {user.name || user.username}
                      {user.id === currentUserId && <span className="ml-2 text-xs font-normal text-[var(--ink-muted)]">You</span>}
                    </div>
                    <div className="text-xs leading-5 text-[var(--ink-muted)]">@{user.username} <span aria-hidden="true">·</span> {user.email}</div>
                  </div>
                  <span className={"w-fit rounded-full border px-2 py-0.5 text-xs font-medium " + (user.role === "admin" ? "border-[var(--accent)]/40 text-[var(--accent)]" : "border-[var(--border-dim)] text-[var(--ink-muted)]")}>
                    {user.role === "admin" ? "Admin" : "User"}
                  </span>
                  {user.id !== currentUserId && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" disabled={pendingId !== null} className={neutralButton} onClick={() => changeRole(user)}>
                        {pendingId === user.id && !removalTarget ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : user.role === "admin" ? <ShieldOff aria-hidden="true" className="h-4 w-4" /> : <Shield aria-hidden="true" className="h-4 w-4" />}
                        {user.role === "admin" ? "Revoke admin" : "Make admin"}
                      </button>
                      {user.can_remove && (
                        <button type="button" aria-label={"Remove user " + user.username} disabled={pendingId !== null} className={dangerButton} onClick={() => setRemovalTarget(user)}>
                          <Trash2 aria-hidden="true" className="h-4 w-4" /> Remove user
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="remove-user-heading"
        aria-describedby="remove-user-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!pendingId) closeRemoval();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[var(--border-dim)] bg-[var(--bg-surface)] p-6 text-[var(--ink)] shadow-xl backdrop:bg-black/65"
      >
        {removalTarget && (
          <div className="space-y-4">
            <h3 id="remove-user-heading" className="break-words text-lg font-semibold">Remove @{removalTarget.username}?</h3>
            <p id="remove-user-description" className="break-words text-sm leading-relaxed text-[var(--ink-muted)]">
              This permanently deletes the account for {removalTarget.email}, including its reading history, bookmarks, quiz records, and votes.
            </p>
            {removalError && <p role="alert" className={"text-sm " + dangerText}>{removalError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button ref={cancelRef} type="button" disabled={pendingId !== null} className={neutralButton} onClick={closeRemoval}>Cancel</button>
              <button type="button" disabled={pendingId !== null} className={buttonClass + " border-red-700 bg-red-700 text-white hover:bg-red-800"} onClick={confirmRemoval}>
                {pendingId ? "Removing…" : "Remove permanently"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
