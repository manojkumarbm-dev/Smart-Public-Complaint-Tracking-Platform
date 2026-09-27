import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

// Role-aware landing page used right after login/registration.
// Sends admins to the admin console and citizens to their dashboard.
export default function PostLogin() {
  const { user, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) checkUserAuth();
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  useEffect(() => {
    if (isLoadingAuth || !authChecked) return;
    if (authError || !user) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, isLoadingAuth, authChecked, authError, navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  );
}