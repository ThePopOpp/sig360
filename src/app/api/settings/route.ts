import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function GET() {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (GATEWAY_TOKEN) {
      headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
    }

    // Try to get status from gateway
    let system = {
      status: 'Online',
      model: 'claude-opus-4-5',
      gatewayVersion: '2026.1.29',
    };

    try {
      const response = await fetch(`${GATEWAY_URL}/api/status`, { headers });
      if (response.ok) {
        const data = await response.json();
        system = {
          status: data.status || 'Online',
          model: data.model || system.model,
          gatewayVersion: data.version || system.gatewayVersion,
        };
      }
    } catch {
      // Gateway might not be reachable, use defaults
    }

    return NextResponse.json({ system });
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json({ 
      system: {
        status: 'Unknown',
        model: 'Unknown',
        gatewayVersion: 'Unknown',
      }
    });
  }
}
