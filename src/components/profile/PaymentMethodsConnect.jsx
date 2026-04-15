import React, { useState, useEffect } from "react";
import { VenmoConnection, PayPalConnection, User } from "@/entities/all";
// Card imports removed - using div-based layout now
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, Trash2, Loader } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentMethodsConnect() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState({});
  const [error, setError] = useState("");

  // Payment method states
  const [venmoUsername, setVenmoUsername] = useState("");
  const [venmoConnection, setVenmoConnection] = useState(null);

  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalConnection, setPaypalConnection] = useState(null);

  const [cashappHandle, setCashappHandle] = useState("");
  const [zelleEmail, setZelleEmail] = useState("");

  // For now, store CashApp and Zelle in the user profile or a generic connection
  // We'll use the profiles table for these

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Load Venmo connection
      const venmoConnections = await VenmoConnection.filter({
        user_id: { eq: currentUser.id }
      });
      if (venmoConnections && venmoConnections.length > 0) {
        setVenmoConnection(venmoConnections[0]);
        setVenmoUsername(venmoConnections[0].venmo_username || "");
      }

      // Load PayPal connection
      const paypalConnections = await PayPalConnection.filter({
        user_id: { eq: currentUser.id }
      });
      if (paypalConnections && paypalConnections.length > 0) {
        setPaypalConnection(paypalConnections[0]);
        setPaypalEmail(paypalConnections[0].paypal_email || "");
      }

      // Load CashApp and Zelle from user profile
      setCashappHandle(currentUser.cashapp_handle || "");
      setZelleEmail(currentUser.zelle_email || "");

    } catch (error) {
      console.error("Error loading payment connections:", error);
    }
    setIsLoading(false);
  };

  const handleSaveVenmo = async () => {
    if (!venmoUsername.trim()) {
      setError("Please enter a Venmo username");
      return;
    }

    setIsSaving(prev => ({ ...prev, venmo: true }));
    setError("");

    try {
      const username = venmoUsername.trim().replace('@', '');
      if (venmoConnection) {
        await VenmoConnection.update(venmoConnection.id, {
          venmo_username: username
        });
        setVenmoConnection({ ...venmoConnection, venmo_username: username });
      } else {
        const newConnection = await VenmoConnection.create({
          user_id: user.id,
          venmo_username: username
        });
        setVenmoConnection(newConnection);
      }
      setVenmoUsername(username);
    } catch (error) {
      console.error("Error saving Venmo:", error);
      setError("Failed to save Venmo username");
    }
    setIsSaving(prev => ({ ...prev, venmo: false }));
  };

  const handleDisconnectVenmo = async () => {
    if (!venmoConnection) return;

    setIsSaving(prev => ({ ...prev, venmo: true }));
    try {
      await VenmoConnection.delete(venmoConnection.id);
      setVenmoConnection(null);
      setVenmoUsername("");
    } catch (error) {
      console.error("Error disconnecting Venmo:", error);
      setError("Failed to disconnect Venmo");
    }
    setIsSaving(prev => ({ ...prev, venmo: false }));
  };

  const handleSavePaypal = async () => {
    if (!paypalEmail.trim()) {
      setError("Please enter a PayPal email or username");
      return;
    }

    setIsSaving(prev => ({ ...prev, paypal: true }));
    setError("");

    try {
      if (paypalConnection) {
        await PayPalConnection.update(paypalConnection.id, {
          paypal_email: paypalEmail.trim()
        });
        setPaypalConnection({ ...paypalConnection, paypal_email: paypalEmail.trim() });
      } else {
        const newConnection = await PayPalConnection.create({
          user_id: user.id,
          paypal_email: paypalEmail.trim()
        });
        setPaypalConnection(newConnection);
      }
    } catch (error) {
      console.error("Error saving PayPal:", error);
      setError("Failed to save PayPal");
    }
    setIsSaving(prev => ({ ...prev, paypal: false }));
  };

  const handleDisconnectPaypal = async () => {
    if (!paypalConnection) return;

    setIsSaving(prev => ({ ...prev, paypal: true }));
    try {
      await PayPalConnection.delete(paypalConnection.id);
      setPaypalConnection(null);
      setPaypalEmail("");
    } catch (error) {
      console.error("Error disconnecting PayPal:", error);
      setError("Failed to disconnect PayPal");
    }
    setIsSaving(prev => ({ ...prev, paypal: false }));
  };

  const handleSaveCashapp = async () => {
    if (!cashappHandle.trim()) {
      setError("Please enter a Cash App $cashtag");
      return;
    }

    setIsSaving(prev => ({ ...prev, cashapp: true }));
    setError("");

    try {
      const handle = cashappHandle.trim().replace('$', '');
      await User.updateMyUserData({ cashapp_handle: handle });
      setCashappHandle(handle);
    } catch (error) {
      console.error("Error saving Cash App:", error);
      setError("Failed to save Cash App");
    }
    setIsSaving(prev => ({ ...prev, cashapp: false }));
  };

  const handleDisconnectCashapp = async () => {
    setIsSaving(prev => ({ ...prev, cashapp: true }));
    try {
      await User.updateMyUserData({ cashapp_handle: null });
      setCashappHandle("");
    } catch (error) {
      console.error("Error disconnecting Cash App:", error);
      setError("Failed to disconnect Cash App");
    }
    setIsSaving(prev => ({ ...prev, cashapp: false }));
  };

  const handleSaveZelle = async () => {
    if (!zelleEmail.trim()) {
      setError("Please enter a Zelle email or phone");
      return;
    }

    setIsSaving(prev => ({ ...prev, zelle: true }));
    setError("");

    try {
      await User.updateMyUserData({ zelle_email: zelleEmail.trim() });
    } catch (error) {
      console.error("Error saving Zelle:", error);
      setError("Failed to save Zelle");
    }
    setIsSaving(prev => ({ ...prev, zelle: false }));
  };

  const handleDisconnectZelle = async () => {
    setIsSaving(prev => ({ ...prev, zelle: true }));
    try {
      await User.updateMyUserData({ zelle_email: null });
      setZelleEmail("");
    } catch (error) {
      console.error("Error disconnecting Zelle:", error);
      setError("Failed to disconnect Zelle");
    }
    setIsSaving(prev => ({ ...prev, zelle: false }));
  };

  if (isLoading) {
    return (
      <div className="bg-[#DBFFEB] rounded-2xl p-5">
        <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          Payment Methods
        </p>
        <div className="flex items-center justify-center py-6">
          <Loader className="w-6 h-6 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-[#DBFFEB] rounded-2xl p-5 w-full">
        <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          Payment Methods
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Connect your payment accounts so friends can easily pay you
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Venmo */}
          <div className="p-3 bg-[#AAFFA3] rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-800">V</span>
              </div>
              <span className="font-medium text-slate-700">Venmo</span>
              {venmoConnection && (
                <span className="text-xs bg-white/60 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="@username"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                className="flex-1 min-w-0 bg-white/70"
              />
              <div className="flex items-center gap-2">
                {venmoConnection ? (
                  <>
                    <Button
                      onClick={handleSaveVenmo}
                      disabled={isSaving.venmo || venmoUsername === venmoConnection.venmo_username}
                      size="sm"
                      className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 flex-1 md:flex-none"
                    >
                      {isSaving.venmo ? "..." : "Update"}
                    </Button>
                    <Button
                      onClick={handleDisconnectVenmo}
                      disabled={isSaving.venmo}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0 bg-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSaveVenmo}
                    disabled={isSaving.venmo || !venmoUsername.trim()}
                    size="sm"
                    className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 w-full md:w-auto"
                  >
                    {isSaving.venmo ? "..." : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Cash App */}
          <div className="p-3 bg-[#30FFA8] rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-800">$</span>
              </div>
              <span className="font-medium text-slate-700">Cash App</span>
              {cashappHandle && user?.cashapp_handle && (
                <span className="text-xs bg-white/60 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="$cashtag"
                value={cashappHandle}
                onChange={(e) => setCashappHandle(e.target.value)}
                className="flex-1 min-w-0 bg-white/70"
              />
              <div className="flex items-center gap-2">
                {cashappHandle && user?.cashapp_handle ? (
                  <>
                    <Button
                      onClick={handleSaveCashapp}
                      disabled={isSaving.cashapp || cashappHandle === user.cashapp_handle}
                      size="sm"
                      className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 flex-1 md:flex-none"
                    >
                      {isSaving.cashapp ? "..." : "Update"}
                    </Button>
                    <Button
                      onClick={handleDisconnectCashapp}
                      disabled={isSaving.cashapp}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0 bg-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSaveCashapp}
                    disabled={isSaving.cashapp || !cashappHandle.trim()}
                    size="sm"
                    className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 w-full md:w-auto"
                  >
                    {isSaving.cashapp ? "..." : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Zelle */}
          <div className="p-3 bg-[#96FFD0] rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-800">Z</span>
              </div>
              <span className="font-medium text-slate-700">Zelle</span>
              {zelleEmail && user?.zelle_email && (
                <span className="text-xs bg-white/60 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="Email or phone"
                value={zelleEmail}
                onChange={(e) => setZelleEmail(e.target.value)}
                className="flex-1 min-w-0 bg-white/70"
              />
              <div className="flex items-center gap-2">
                {zelleEmail && user?.zelle_email ? (
                  <>
                    <Button
                      onClick={handleSaveZelle}
                      disabled={isSaving.zelle || zelleEmail === user.zelle_email}
                      size="sm"
                      className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 flex-1 md:flex-none"
                    >
                      {isSaving.zelle ? "..." : "Update"}
                    </Button>
                    <Button
                      onClick={handleDisconnectZelle}
                      disabled={isSaving.zelle}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0 bg-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSaveZelle}
                    disabled={isSaving.zelle || !zelleEmail.trim()}
                    size="sm"
                    className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 w-full md:w-auto"
                  >
                    {isSaving.zelle ? "..." : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* PayPal */}
          <div className="p-3 bg-[#6EE8A2] rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-800">P</span>
              </div>
              <span className="font-medium text-slate-700">PayPal</span>
              {paypalConnection && (
                <span className="text-xs bg-white/60 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="Email or PayPal.me"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="flex-1 min-w-0 bg-white/70"
              />
              <div className="flex items-center gap-2">
                {paypalConnection ? (
                  <>
                    <Button
                      onClick={handleSavePaypal}
                      disabled={isSaving.paypal || paypalEmail === paypalConnection.paypal_email}
                      size="sm"
                      className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 flex-1 md:flex-none"
                    >
                      {isSaving.paypal ? "..." : "Update"}
                    </Button>
                    <Button
                      onClick={handleDisconnectPaypal}
                      disabled={isSaving.paypal}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0 bg-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSavePaypal}
                    disabled={isSaving.paypal || !paypalEmail.trim()}
                    size="sm"
                    className="bg-[#00A86B] hover:bg-[#0D9B76] text-white flex-shrink-0 w-full md:w-auto"
                  >
                    {isSaving.paypal ? "..." : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
