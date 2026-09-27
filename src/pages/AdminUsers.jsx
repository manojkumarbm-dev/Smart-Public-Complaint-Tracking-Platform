import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Users, Mail, Shield, User as UserIcon, UserPlus, ArrowUpDown, CheckCircle2, AlertCircle, X,
} from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "user" });
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = () => {
    setLoading(true);
    base44.entities.User.list()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (u) => {
    setBusyId(u.id);
    setFeedback("");
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await base44.entities.User.update(u.id, { role: newRole });
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
      setFeedback(`${u.email} is now ${newRole === "admin" ? "an administrator" : "a citizen"}.`);
    } catch (err) {
      setFeedback(err.message || "Could not update role.");
    } finally {
      setBusyId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteErr("");
    setInviteMsg("");
    if (!invite.email.trim()) {
      setInviteErr("Please enter an email address.");
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(invite.email.trim(), invite.role);
      setInviteMsg(`Invitation sent to ${invite.email.trim()} as ${invite.role === "admin" ? "admin" : "citizen"}.`);
      setInvite({ email: "", role: "user" });
      load();
    } catch (err) {
      setInviteErr(err.message || "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  };

  const admins = users.filter((u) => u.role === "admin").length;
  const citizens = users.filter((u) => u.role !== "admin").length;

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Users</h1>
          <p className="text-slate-500">Manage citizens and administrators.</p>
        </div>
        <Button onClick={() => setInviteOpen((v) => !v)} className="bg-blue-700 hover:bg-blue-800">
          <UserPlus size={16} /> Invite User
        </Button>
      </div>

      {feedback && (
        <div className="mt-4 flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-3 py-2.5">
          <CheckCircle2 size={16} /> {feedback}
        </div>
      )}

      {inviteOpen && (
        <form onSubmit={handleInvite} className="mt-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Invite a new user</h3>
            <button type="button" onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          {inviteErr && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle size={14} /> {inviteErr}
            </div>
          )}
          {inviteMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
              <CheckCircle2 size={14} /> {inviteMsg}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={invite.email}
                onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                placeholder="user@example.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <select
                value={invite.role}
                onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="user">Citizen</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={inviting} className="bg-blue-700 hover:bg-blue-800">
            {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Send Invitation
          </Button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Users size={16} /> Total Users</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Shield size={16} /> Admins</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{admins}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><UserIcon size={16} /> Citizens</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{citizens}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Joined</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.full_name || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">
                    <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {u.email}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {u.role === "admin" ? "Admin" : "Citizen"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={busyId === u.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50"
                    >
                      {busyId === u.id ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpDown size={13} />}
                      {u.role === "admin" ? "Make Citizen" : "Promote to Admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}