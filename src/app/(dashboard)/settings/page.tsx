'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RefreshCw, Shield, Cpu, Wifi } from "lucide-react";

interface SystemInfo {
  gatewayVersion?: string;
  model?: string;
  uptime?: string;
  status?: string;
}

export default function SettingsPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSystemInfo(data.system || {});
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-orange-500" />
          Settings
        </h1>
        <p className="text-zinc-400">Dashboard and system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Info */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-zinc-400" />
              System Information
            </CardTitle>
            <CardDescription>OpenClaw gateway status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-zinc-500">Loading...</div>
            ) : (
              <>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Status</span>
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    {systemInfo.status || 'Online'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Model</span>
                  <span className="text-white">{systemInfo.model || 'claude-opus-4-5'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Version</span>
                  <span className="text-white">{systemInfo.gatewayVersion || '2026.1.29'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400">Gateway URL</span>
                  <code className="text-zinc-300 text-sm">localhost:18789</code>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Connection */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-zinc-400" />
              Connection
            </CardTitle>
            <CardDescription>Dashboard connection settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Gateway URL</label>
              <Input
                defaultValue="http://localhost:18789"
                className="bg-zinc-800 border-zinc-700 text-white"
                disabled
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Workspace Path</label>
              <Input
                defaultValue="/root/.openclaw/workspace"
                className="bg-zinc-800 border-zinc-700 text-white"
                disabled
              />
            </div>
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={isLoading}
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-zinc-400" />
              Security
            </CardTitle>
            <CardDescription>Authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Authentication</span>
              <Badge variant="outline" className="border-green-500 text-green-500">
                Token
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-zinc-400">Session</span>
              <Badge variant="outline" className="border-blue-500 text-blue-500">
                Active
              </Badge>
            </div>
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 mt-4"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">About JDub Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 text-sm mb-4">
              JDub Dashboard provides a web interface for managing your AI assistant, 
              viewing memory, scheduling tasks, and monitoring system status.
            </p>
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Dashboard v1.0.0</p>
              <p>Built with Next.js + shadcn/ui</p>
              <p>© 2026 JDub</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
