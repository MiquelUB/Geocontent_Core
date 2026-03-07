"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { loginOrRegister } from "@/lib/actions";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface SimpleLoginProps {
  onLoginSuccess: (user: any) => void;
}

export function SimpleLogin({ onLoginSuccess }: SimpleLoginProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name || !email) {
      setError("Si us plau, emplena tots els camps");
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginOrRegister(name, email);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || "Error al entrar");
      }
    } catch (err) {
      setError("Error de connexió");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-primary mb-2">Benvingut/da</h1>
          <p className="text-gray-500 text-sm">Introdueix les teves dades per començar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Nom</label>
            <Input
              placeholder="El teu nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-50"
            />
          </div>

          <div className="text-left">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Correu Electrònic</label>
            <Input
              type="email"
              placeholder="el-teu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-50"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" className="w-full pallars-button" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Entrar / Registrar-se"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
